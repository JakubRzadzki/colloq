from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, func

from app.models import User, Note, University, Review, Comment
from app.schemas import NoteOut, UniversityOut
from app.services.file_manager import normalize_stored_path

def get_home_data(db: Session):
    users_count = db.query(func.count(User.id)).scalar() or 0
    notes_count = db.query(func.count(Note.id)).scalar() or 0
    universities_count = db.query(func.count(University.id)).filter(University.is_approved == True).scalar() or 0
    
    latest_note = db.query(Note).order_by(desc(Note.created_at)).first()
    latest_user = db.query(User).order_by(desc(User.created_at)).first()
    latest_review = db.query(Review).order_by(desc(Review.created_at)).first()
    
    latest_activity = {
        "latest_note": {"id": latest_note.id, "title": latest_note.title, "created_at": str(latest_note.created_at) if latest_note else None, "university_id": latest_note.university_id} if latest_note else None,
        "latest_user": {"id": latest_user.id, "nickname": latest_user.nickname, "created_at": str(latest_user.created_at) if latest_user else None} if latest_user else None,
        "latest_review": {"id": latest_review.id, "content": latest_review.content, "created_at": str(latest_review.created_at) if latest_review else None, "university_id": latest_review.university_id} if latest_review else None,
    }
    
    top_users = db.query(User).order_by(desc(User.reputation_points)).limit(5).all()
    user_ids = [u.id for u in top_users]
    notes_per_user = {}
    reviews_per_user = {}
    comments_per_user = {}
    
    if user_ids:
        for uid, c in db.query(Note.user_id, func.count(Note.id)).filter(Note.user_id.in_(user_ids)).group_by(Note.user_id).all():
            notes_per_user[uid] = c
        for uid, c in db.query(Review.user_id, func.count(Review.id)).filter(Review.user_id.in_(user_ids)).group_by(Review.user_id).all():
            reviews_per_user[uid] = c
        for uid, c in db.query(Comment.user_id, func.count(Comment.id)).filter(Comment.user_id.in_(user_ids)).group_by(Comment.user_id).all():
            comments_per_user[uid] = c
            
    leaderboard = []
    for rank, user in enumerate(top_users, start=1):
        nc = notes_per_user.get(user.id, 0)
        rvc = reviews_per_user.get(user.id, 0)
        cc = comments_per_user.get(user.id, 0)
        leaderboard.append({
            "rank": rank, "user_id": user.id, "nickname": user.nickname, "avatar_url": user.avatar_url,
            "reputation_points": user.reputation_points, "uploads_count": user.uploads_count,
            "notes_count": nc, "total_score": user.reputation_points, "reviews_count": rvc, "comments_count": cc,
            "total_activity": nc + rvc + cc,
        })
        
    recent_notes_act = db.query(Note).options(joinedload(Note.author)).order_by(desc(Note.created_at)).limit(5).all()
    recent_reviews_act = db.query(Review).options(joinedload(Review.user), joinedload(Review.note)).order_by(desc(Review.created_at)).limit(5).all()
    
    activities = []
    for note in recent_notes_act:
        activities.append({"type": "note", "title": note.title, "description": note.content[:200] if note.content else None, "created_at": str(note.created_at) if note.created_at else None, "user_nickname": note.author.nickname if note.author else "Anonymous"})
    for review in recent_reviews_act:
        activities.append({"type": "review", "rating": review.rating, "comment": review.content, "created_at": str(review.created_at) if review.created_at else None, "user_nickname": review.user.nickname if review.user else "Anonymous", "note_title": review.note.title if review.note else None})
    activities.sort(key=lambda x: x.get("created_at") or "", reverse=True)
    activity_feed = activities[:5]
    
    recent_notes = db.query(Note).options(joinedload(Note.author), joinedload(Note.subject), joinedload(Note.images), joinedload(Note.files)).order_by(desc(Note.created_at)).limit(6).all()
    universities_list = db.query(University).filter(University.is_approved == True).all()
    
    recent_notes_out = []
    for n in recent_notes:
        o = NoteOut.model_validate(n)
        if o.image_url:
            o.image_url = normalize_stored_path(o.image_url)
        recent_notes_out.append(o.model_dump())
        
    unis_out = [UniversityOut.model_validate(u).model_dump() for u in universities_list]
    
    return {
        "stats": {"users": users_count, "notes": notes_count, "universities": universities_count, "users_count": users_count, "notes_count": notes_count, "universities_count": universities_count, "latest_activity": latest_activity},
        "leaderboard": {"leaderboard": leaderboard, "total_users": users_count},
        "activity_feed": activity_feed,
        "recent_notes": recent_notes_out,
        "universities": unis_out,
    }
