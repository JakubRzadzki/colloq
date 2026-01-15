import os
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from . import database, models

# Security configuration - should be in environment variables
SECRET_KEY = os.getenv("SECRET_KEY", "bardzo_tajny_klucz_zmien_go_na_produkcji")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 scheme for token extraction
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


def verify_password(plain_password: str, hashed_password: str) -> bool:
	"""
	Verify a plain password against a hashed password

	Args:
		plain_password: The plain text password
		hashed_password: The hashed password from database

	Returns:
		True if passwords match, False otherwise
	"""
	return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
	"""
	Hash a password for storing in database

	Args:
		password: The plain text password

	Returns:
		Hashed password string
	"""
	return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
	"""
	Create JWT access token with claims

	Args:
		data: Dictionary containing token claims (sub, is_admin, nick, etc.)
		expires_delta: Optional custom expiration time

	Returns:
		Encoded JWT token string
	"""
	to_encode = data.copy()

	if expires_delta:
		expire = datetime.utcnow() + expires_delta
	else:
		expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

	to_encode.update({"exp": expire})
	encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

	return encoded_jwt


async def get_current_user(
		token: str = Depends(oauth2_scheme),
		db: Session = Depends(database.get_db)
) -> models.User:
	"""
	Get current authenticated user from JWT token

	Args:
		token: JWT token from Authorization header
		db: Database session

	Returns:
		User model instance

	Raises:
		HTTPException: If token is invalid or user not found
	"""
	credentials_exception = HTTPException(
		status_code=status.HTTP_401_UNAUTHORIZED,
		detail="Could not validate credentials",
		headers={"WWW-Authenticate": "Bearer"},
	)

	try:
		# Decode JWT token
		payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
		email: str = payload.get("sub")

		if email is None:
			raise credentials_exception

	except JWTError:
		raise credentials_exception

	# Fetch user from database
	user = db.query(models.User).filter(models.User.email == email).first()

	if user is None:
		raise credentials_exception

	# Check if user is active
	if not user.is_active:
		raise HTTPException(
			status_code=status.HTTP_403_FORBIDDEN,
			detail="Inactive user account"
		)

	return user


async def get_current_active_admin(
		current_user: models.User = Depends(get_current_user)
) -> models.User:
	"""
	Verify that current user is an admin

	Args:
		current_user: The authenticated user

	Returns:
		User model instance if admin

	Raises:
		HTTPException: If user is not an admin
	"""
	if not current_user.is_admin:
		raise HTTPException(
			status_code=status.HTTP_403_FORBIDDEN,
			detail="Admin privileges required for this operation"
		)
	return current_user