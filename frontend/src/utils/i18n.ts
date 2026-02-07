import { useState, useEffect } from 'react';

// Translation resources
const resources = {
  en: {
    // Navigation
    home: 'Home',
    search: 'Search',
    universities: 'Universities',
    profile: 'Profile',
    login: 'Login',
    register: 'Register',
    logout: 'Logout',
    
    // Theme
    light_mode: 'Light Mode',
    dark_mode: 'Dark Mode',
    
    // Language
    language: 'Language',
    english: 'English',
    polish: 'Polish',
    
    // Hero
    hero_title: 'Your Academic Knowledge Hub',
    hero_subtitle: 'Share, discover, and grow together',
    get_started: 'Get Started',
    
    // Search
    search_placeholder: 'Search notes, universities, or terms...',
    search_results: 'Search Results',
    no_results: 'No results found',
    
    // Live Feed
    live_feed: 'Live Data Feed',
    recent_notes: 'Recent Notes',
    recent_reviews: 'Recent Reviews',
    view_all: 'View All',
    
    // Leaderboard
    top_contributors: 'Top Contributors',
    reputation: 'Reputation',
    uploads: 'Uploads',
    
    // Stats
    stats: 'Community Stats',
    total_users: 'Total Users',
    total_notes: 'Total Notes',
    total_universities: 'Total Universities',
    
    // Notes
    notes: 'Notes',
    upload_note: 'Upload Note',
    title: 'Title',
    description: 'Description',
    file: 'File',
    university: 'University',
    faculty: 'Faculty',
    upload: 'Upload',
    cancel: 'Cancel',
    upload_success: 'Note uploaded successfully!',
    upload_error: 'Failed to upload note. Please try again.',
    
    // Profile
    my_profile: 'My Profile',
    my_uploads: 'My Uploads',
    reputation_points: 'Reputation Points',
    edit_profile: 'Edit Profile',
    change_avatar: 'Change Avatar',
    save_changes: 'Save Changes',
    profile_updated: 'Profile updated successfully!',
    
    // University
    create_university: 'Create University',
    university_name: 'University Name',
    city: 'City',
    country: 'Country',
    university_description: 'Description',
    university_image: 'Image',
    create: 'Create',
    university_created: 'University created successfully!',
    
    // Faculty
    create_faculty: 'Create Faculty',
    faculty_name: 'Faculty Name',
    faculty_description: 'Description',
    faculty_image: 'Image',
    faculty_created: 'Faculty created successfully!',
    
    // Auth
    email: 'Email',
    password: 'Password',
    nickname: 'Nickname',
    confirm_password: 'Confirm Password',
    login_success: 'Login successful!',
    register_success: 'Registration successful!',
    login_error: 'Invalid email or password',
    register_error: 'Registration failed. Please try again.',
    passwords_dont_match: 'Passwords do not match',
    
    // Upload Barrier
    upload_barrier_title: 'Upload Barrier',
    upload_barrier_desc: 'You need to upload at least one note to access other users\' notes. This helps maintain the quality and growth of our community.',
    unlock_with_upload: 'Upload to Unlock',
    
    // Reviews
    rate_note: 'Rate this note',
    write_review: 'Write a review',
    submit_review: 'Submit Review',
    review_submitted: 'Review submitted successfully!',
    
    // Errors
    error: 'Error',
    something_went_wrong: 'Something went wrong. Please try again.',
    not_found: 'Not Found',
    page_not_found: 'The page you are looking for does not exist.',
    
    // Loading
    loading: 'Loading...',
    saving: 'Saving...',
    uploading: 'Uploading...',
    
    // Success
    success: 'Success',
    action_completed: 'Action completed successfully!',
    
    // Forms
    required_field: 'This field is required',
    invalid_email: 'Please enter a valid email address',
    password_too_short: 'Password must be at least 6 characters long',
    nickname_taken: 'This nickname is already taken',
    email_taken: 'This email is already registered',
    
    // Actions
    view: 'View',
    edit: 'Edit',
    delete: 'Delete',
    close: 'Close',
    back: 'Back',
    
    // Dates
    today: 'Today',
    yesterday: 'Yesterday',
    this_week: 'This Week',
    this_month: 'This Month',
    
    // Empty states
    no_notes_yet: 'No notes yet',
    no_reviews_yet: 'No reviews yet',
    no_universities: 'No universities found',
    no_faculties: 'No faculties found',
    
    // Filters
    filter: 'Filter',
    sort: 'Sort',
    newest: 'Newest',
    oldest: 'Oldest',
    highest_rated: 'Highest Rated',
    most_popular: 'Most Popular',
    
    // Notifications
    notification: 'Notification',
    notifications: 'Notifications',
    clear_all: 'Clear All',
    
    // Settings
    settings: 'Settings',
    general: 'General',
    appearance: 'Appearance',
    security: 'Security',
    privacy: 'Privacy',
    
    // Help
    help: 'Help',
    faq: 'FAQ',
    contact_support: 'Contact Support',
    report_bug: 'Report a Bug',
    
    // Footer
    about: 'About',
    terms: 'Terms of Service',
    privacy_policy: 'Privacy Policy',
    cookies: 'Cookie Policy',
    
    // Social
    share: 'Share',
    like: 'Like',
    comment: 'Comment',
    views: 'Views',
    
    // Badges
    contributor: 'Contributor',
    expert: 'Expert',
    legend: 'Legend',
    
    // Progress
    progress: 'Progress',
    completed: 'Completed',
    in_progress: 'In Progress',
    not_started: 'Not Started',
    
    // Categories
    category: 'Category',
    categories: 'Categories',
    all_categories: 'All Categories',
    
    // Tags
    tags: 'Tags',
    add_tag: 'Add Tag',
    remove_tag: 'Remove Tag',
    
    // Search filters
    search_filters: 'Search Filters',
    clear_filters: 'Clear Filters',
    apply_filters: 'Apply Filters',
    
    // Pagination
    previous: 'Previous',
    next: 'Next',
    page: 'Page',
    of: 'of',
    
    // File upload
    drag_drop: 'Drag and drop files here, or click to select files',
    file_selected: 'File selected',
    max_file_size: 'Maximum file size: 10MB',
    supported_formats: 'Supported formats: PDF, DOC, DOCX, TXT',
    
    // Ratings
    rating: 'Rating',
    ratings: 'Ratings',
    average_rating: 'Average Rating',
    give_rating: 'Give Rating',
    
    // Comments
    comments: 'Comments',
    add_comment: 'Add Comment',
    post_comment: 'Post Comment',
    no_comments: 'No comments yet',
    
    // Moderation
    report: 'Report',
    spam: 'Spam',
    inappropriate: 'Inappropriate Content',
    duplicate: 'Duplicate Content',
    report_sent: 'Report sent successfully',
    
    // Admin
    admin_panel: 'Admin Panel',
    manage_users: 'Manage Users',
    manage_content: 'Manage Content',
    system_stats: 'System Statistics',
    user_management: 'User Management',
    content_moderation: 'Content Moderation',
    
    // University pages
    university_details: 'University Details',
    faculties: 'Faculties',
    departments: 'Departments',
    programs: 'Programs',
    admission: 'Admission',
    contact: 'Contact',
    
    // Note details
    note_details: 'Note Details',
    download: 'Download',
    download_count: 'Download Count',
    file_size: 'File Size',
    file_type: 'File Type',
    last_updated: 'Last Updated',
    
    // Profile stats
    total_notes: 'Total Notes',
    total_reviews: 'Total Reviews',
    total_ratings: 'Total Ratings',
    account_created: 'Account Created',
    last_active: 'Last Active',
    
    // University stats
    total_faculties: 'Total Faculties',
    total_students: 'Total Students',
    established: 'Established',
    ranking: 'Ranking',
    
    // Faculty stats
    total_departments: 'Total Departments',
    total_programs: 'Total Programs',
    dean: 'Dean',
    
    // Review stats
    helpful: 'Helpful',
    not_helpful: 'Not Helpful',
    was_this_review_helpful: 'Was this review helpful?',
    
    // Upload restrictions
    upload_limit_reached: 'Upload limit reached',
    daily_upload_limit: 'You have reached your daily upload limit',
    file_too_large: 'File is too large',
    unsupported_format: 'Unsupported file format',
    
    // Account
    account: 'Account',
    account_settings: 'Account Settings',
    change_email: 'Change Email',
    change_password: 'Change Password',
    delete_account: 'Delete Account',
    account_deleted: 'Account deleted successfully',
    
    // Security
    two_factor_auth: 'Two-Factor Authentication',
    security_questions: 'Security Questions',
    login_history: 'Login History',
    active_sessions: 'Active Sessions',
    
    // Privacy
    privacy_settings: 'Privacy Settings',
    data_export: 'Data Export',
    data_deletion: 'Data Deletion',
    cookie_settings: 'Cookie Settings',
    
    // Accessibility
    accessibility: 'Accessibility',
    keyboard_shortcuts: 'Keyboard Shortcuts',
    screen_reader: 'Screen Reader',
    high_contrast: 'High Contrast',
    
    // Mobile
    mobile_app: 'Mobile App',
    download_app: 'Download App',
    app_store: 'App Store',
    google_play: 'Google Play',
    
    // Integrations
    integrations: 'Integrations',
    connected_apps: 'Connected Apps',
    api_keys: 'API Keys',
    webhooks: 'Webhooks',
    
    // Analytics
    analytics: 'Analytics',
    dashboard: 'Dashboard',
    reports: 'Reports',
    insights: 'Insights',
    
    // Notifications settings
    email_notifications: 'Email Notifications',
    push_notifications: 'Push Notifications',
    notification_preferences: 'Notification Preferences',
    
    // System
    system_status: 'System Status',
    maintenance: 'Maintenance',
    updates: 'Updates',
    changelog: 'Changelog',
    
    // Legal
    legal: 'Legal',
    terms_of_service: 'Terms of Service',
    privacy_notice: 'Privacy Notice',
    cookie_policy: 'Cookie Policy',
    disclaimer: 'Disclaimer',
    
    // Community
    community: 'Community',
    forums: 'Forums',
    discussions: 'Discussions',
    groups: 'Groups',
    events: 'Events',
    
    // Learning
    learning: 'Learning',
    tutorials: 'Tutorials',
    guides: 'Guides',
    resources: 'Resources',
    documentation: 'Documentation',
    
    // Support
    support: 'Support',
    help_center: 'Help Center',
    contact_us: 'Contact Us',
    live_chat: 'Live Chat',
    community_support: 'Community Support',
    
    // Feedback
    feedback: 'Feedback',
    send_feedback: 'Send Feedback',
    feature_request: 'Feature Request',
    bug_report: 'Bug Report',
    feedback_sent: 'Feedback sent successfully',
    
    // Sharing
    share_link: 'Share Link',
    copy_link: 'Copy Link',
    copied: 'Copied!',
    share_facebook: 'Share on Facebook',
    share_twitter: 'Share on Twitter',
    share_linkedin: 'Share on LinkedIn',
    share_email: 'Share via Email',
    
    // Bookmarks
    bookmarks: 'Bookmarks',
    saved_items: 'Saved Items',
    bookmark: 'Bookmark',
    unbookmark: 'Unbookmark',
    bookmarked: 'Bookmarked',
    
    // Collections
    collections: 'Collections',
    create_collection: 'Create Collection',
    add_to_collection: 'Add to Collection',
    collection_name: 'Collection Name',
    collection_description: 'Collection Description',
    
    // Tags management
    tag_management: 'Tag Management',
    create_tag: 'Create Tag',
    edit_tag: 'Edit Tag',
    delete_tag: 'Delete Tag',
    tag_name: 'Tag Name',
    tag_description: 'Tag Description',
    
    // Search suggestions
    search_suggestions: 'Search Suggestions',
    popular_searches: 'Popular Searches',
    trending_topics: 'Trending Topics',
    related_searches: 'Related Searches',
    
    // Filters management
    filter_management: 'Filter Management',
    save_filter: 'Save Filter',
    load_filter: 'Load Filter',
    delete_filter: 'Delete Filter',
    filter_name: 'Filter Name',
    
    // Sorting options
    sort_by: 'Sort By',
    sort_order: 'Sort Order',
    ascending: 'Ascending',
    descending: 'Descending',
    
    // View options
    view: 'View',
    list_view: 'List View',
    grid_view: 'Grid View',
    table_view: 'Table View',
    
    // Export options
    export: 'Export',
    export_data: 'Export Data',
    export_format: 'Export Format',
    csv: 'CSV',
    excel: 'Excel',
    pdf: 'PDF',
    
    // Import options
    import: 'Import',
    import_data: 'Import Data',
    import_format: 'Import Format',
    import_file: 'Import File',
    
    // Bulk actions
    bulk_actions: 'Bulk Actions',
    select_all: 'Select All',
    deselect_all: 'Deselect All',
    bulk_delete: 'Bulk Delete',
    bulk_edit: 'Bulk Edit',
    
    // Confirmation dialogs
    confirm_action: 'Confirm Action',
    are_you_sure: 'Are you sure?',
    confirm_delete: 'Are you sure you want to delete this item?',
    confirm_logout: 'Are you sure you want to logout?',
    confirm_exit: 'Are you sure you want to exit? Unsaved changes will be lost.',
    
    // Success messages
    saved_successfully: 'Saved successfully!',
    updated_successfully: 'Updated successfully!',
    deleted_successfully: 'Deleted successfully!',
    created_successfully: 'Created successfully!',
    
    // Error messages
    save_failed: 'Save failed. Please try again.',
    update_failed: 'Update failed. Please try again.',
    delete_failed: 'Delete failed. Please try again.',
    create_failed: 'Create failed. Please try again.',
    network_error: 'Network error. Please check your connection.',
    server_error: 'Server error. Please try again later.',
    unauthorized: 'Unauthorized access. Please login.',
    forbidden: 'Access forbidden. You do not have permission.',
    not_found_error: 'Resource not found.',
    validation_error: 'Validation error. Please check your input.',
    
    // Warning messages
    warning: 'Warning',
    unsaved_changes: 'You have unsaved changes. Are you sure you want to leave?',
    file_size_warning: 'File size is large. This may take some time to upload.',
    format_warning: 'This file format may not be fully supported.',
    
    // Info messages
    info: 'Information',
    new_feature: 'New feature available!',
    update_available: 'Update available. Please refresh the page.',
    maintenance_scheduled: 'Maintenance scheduled for tonight at 2 AM.',
    
    // Loading states
    loading_data: 'Loading data...',
    loading_content: 'Loading content...',
    processing: 'Processing...',
    please_wait: 'Please wait...',
    
    // Empty states
    no_data: 'No data available',
    no_items: 'No items to display',
    no_matches: 'No matches found',
    try_different_search: 'Try a different search or filter',
    
    // Pagination info
    showing: 'Showing',
    to: 'to',
    entries: 'entries',
    filtered_from: 'filtered from',
    total_entries: 'total entries',
    
    // Search info
    search_results_for: 'Search results for',
    no_search_results: 'No search results found for',
    try_different_keywords: 'Try different keywords',
    
    // Filter info
    active_filters: 'Active filters',
    remove_filter: 'Remove filter',
    clear_all_filters: 'Clear all filters',
    
    // Sort info
    current_sort: 'Current sort',
    change_sort: 'Change sort',
    
    // View info
    current_view: 'Current view',
    change_view: 'Change view',
    
    // Export info
    export_in_progress: 'Export in progress...',
    export_complete: 'Export completed!',
    export_failed: 'Export failed. Please try again.',
    
    // Import info
    import_in_progress: 'Import in progress...',
    import_complete: 'Import completed!',
    import_failed: 'Import failed. Please try again.',
    import_errors: 'Import errors found. Please check the file format.',
    
    // Bulk info
    bulk_operation_in_progress: 'Bulk operation in progress...',
    bulk_operation_complete: 'Bulk operation completed!',
    bulk_operation_failed: 'Bulk operation failed. Please try again.',
    
    // System info
    system_info: 'System Information',
    version: 'Version',
    build_date: 'Build Date',
    environment: 'Environment',
    database_status: 'Database Status',
    cache_status: 'Cache Status',
    
    // User info
    user_info: 'User Information',
    user_id: 'User ID',
    username: 'Username',
    email_verified: 'Email Verified',
    account_status: 'Account Status',
    last_login: 'Last Login',
    registration_date: 'Registration Date',
    
    // File info
    file_info: 'File Information',
    filename: 'Filename',
    file_size: 'File Size',
    file_type: 'File Type',
    upload_date: 'Upload Date',
    download_count: 'Download Count',
    view_count: 'View Count',
    
    // Note info
    note_info: 'Note Information',
    note_id: 'Note ID',
    note_title: 'Note Title',
    note_description: 'Note Description',
    note_author: 'Note Author',
    note_created: 'Created',
    note_modified: 'Modified',
    note_category: 'Category',
    note_tags: 'Tags',
    
    // Review info
    review_info: 'Review Information',
    review_id: 'Review ID',
    review_rating: 'Rating',
    review_comment: 'Comment',
    review_author: 'Author',
    review_date: 'Date',
    review_helpful: 'Helpful Votes',
    review_unhelpful: 'Unhelpful Votes',
    
    // University info
    university_info: 'University Information',
    university_id: 'University ID',
    university_name: 'Name',
    university_city: 'City',
    university_country: 'Country',
    university_description: 'Description',
    university_established: 'Established',
    university_website: 'Website',
    university_ranking: 'Ranking',
    
    // Faculty info
    faculty_info: 'Faculty Information',
    faculty_id: 'Faculty ID',
    faculty_name: 'Name',
    faculty_description: 'Description',
    faculty_dean: 'Dean',
    faculty_established: 'Established',
    faculty_website: 'Website',
    
    // Department info
    department_info: 'Department Information',
    department_id: 'Department ID',
    department_name: 'Name',
    department_description: 'Description',
    department_head: 'Head',
    department_established: 'Established',
    department_website: 'Website',
    
    // Program info
    program_info: 'Program Information',
    program_id: 'Program ID',
    program_name: 'Name',
    program_description: 'Description',
    program_duration: 'Duration',
    program_level: 'Level',
    program_credits: 'Credits',
    program_website: 'Website',
    
    // Course info
    course_info: 'Course Information',
    course_id: 'Course ID',
    course_name: 'Name',
    course_description: 'Description',
    course_credits: 'Credits',
    course_semester: 'Semester',
    course_instructor: 'Instructor',
    course_capacity: 'Capacity',
    course_enrolled: 'Enrolled',
    
    // Assignment info
    assignment_info: 'Assignment Information',
    assignment_id: 'Assignment ID',
    assignment_name: 'Name',
    assignment_description: 'Description',
    assignment_due_date: 'Due Date',
    assignment_points: 'Points',
    assignment_status: 'Status',
    assignment_submitted: 'Submitted',
    assignment_grade: 'Grade',
    
    // Exam info
    exam_info: 'Exam Information',
    exam_id: 'Exam ID',
    exam_name: 'Name',
    exam_description: 'Description',
    exam_date: 'Date',
    exam_time: 'Time',
    exam_duration: 'Duration',
    exam_location: 'Location',
    exam_type: 'Type',
    
    // Grade info
    grade_info: 'Grade Information',
    grade_id: 'Grade ID',
    grade_value: 'Value',
    grade_points: 'Points',
    grade_letter: 'Letter Grade',
    grade_semester: 'Semester',
    grade_course: 'Course',
    grade_instructor: 'Instructor',
    grade_date: 'Date',
    
    // Attendance info
    attendance_info: 'Attendance Information',
    attendance_id: 'Attendance ID',
    attendance_date: 'Date',
    attendance_status: 'Status',
    attendance_course: 'Course',
    attendance_instructor: 'Instructor',
    attendance_reason: 'Reason',
    
    // Schedule info
    schedule_info: 'Schedule Information',
    schedule_id: 'Schedule ID',
    schedule_day: 'Day',
    schedule_start_time: 'Start Time',
    schedule_end_time: 'End Time',
    schedule_course: 'Course',
    schedule_instructor: 'Instructor',
    schedule_location: 'Location',
    
    // Calendar info
    calendar_info: 'Calendar Information',
    calendar_id: 'Calendar ID',
    calendar_title: 'Title',
    calendar_description: 'Description',
    calendar_start_date: 'Start Date',
    calendar_end_date: 'End Date',
    calendar_all_day: 'All Day',
    calendar_location: 'Location',
    calendar_recurring: 'Recurring',
    
    // Event info
    event_info: 'Event Information',
    event_id: 'Event ID',
    event_title: 'Title',
    event_description: 'Description',
    event_start_date: 'Start Date',
    event_end_date: 'End Date',
    event_location: 'Location',
    event_organizer: 'Organizer',
    event_capacity: 'Capacity',
    event_registered: 'Registered',
    
    // News info
    news_info: 'News Information',
    news_id: 'News ID',
    news_title: 'Title',
    news_description: 'Description',
    news_content: 'Content',
    news_author: 'Author',
    news_date: 'Date',
    news_category: 'Category',
    news_tags: 'Tags',
    
    // Announcement info
    announcement_info: 'Announcement Information',
    announcement_id: 'Announcement ID',
    announcement_title: 'Title',
    announcement_content: 'Content',
    announcement_author: 'Author',
    announcement_date: 'Date',
    announcement_priority: 'Priority',
    announcement_expires: 'Expires',
    
    // Message info
    message_info: 'Message Information',
    message_id: 'Message ID',
    message_subject: 'Subject',
    message_content: 'Content',
    message_sender: 'Sender',
    message_recipient: 'Recipient',
    message_date: 'Date',
    message_read: 'Read',
    message_replied: 'Replied',
    
    // Chat info
    chat_info: 'Chat Information',
    chat_id: 'Chat ID',
    chat_name: 'Name',
    chat_description: 'Description',
    chat_creator: 'Creator',
    chat_created: 'Created',
    chat_members: 'Members',
    chat_messages: 'Messages',
    
    // Forum info
    forum_info: 'Forum Information',
    forum_id: 'Forum ID',
    forum_name: 'Name',
    forum_description: 'Description',
    forum_creator: 'Creator',
    forum_created: 'Created',
    forum_topics: 'Topics',
    forum_posts: 'Posts',
    forum_last_post: 'Last Post',
    
    // Topic info
    topic_info: 'Topic Information',
    topic_id: 'Topic ID',
    topic_title: 'Title',
    topic_description: 'Description',
    topic_author: 'Author',
    topic_created: 'Created',
    topic_replies: 'Replies',
    topic_views: 'Views',
    topic_last_post: 'Last Post',
    
    // Post info
    post_info: 'Post Information',
    post_id: 'Post ID',
    post_content: 'Content',
    post_author: 'Author',
    post_date: 'Date',
    post_edited: 'Edited',
    post_edited_by: 'Edited By',
    post_edited_date: 'Edited Date',
    
    // Comment info
    comment_info: 'Comment Information',
    comment_id: 'Comment ID',
    comment_content: 'Content',
    comment_author: 'Author',
    comment_date: 'Date',
    comment_edited: 'Edited',
    comment_edited_by: 'Edited By',
    comment_edited_date: 'Edited Date',
    
    // Reply info
    reply_info: 'Reply Information',
    reply_id: 'Reply ID',
    reply_content: 'Content',
    reply_author: 'Author',
    reply_date: 'Date',
    reply_edited: 'Edited',
    reply_edited_by: 'Edited By',
    reply_edited_date: 'Edited Date',
    
    // Like info
    like_info: 'Like Information',
    like_id: 'Like ID',
    like_user: 'User',
    like_date: 'Date',
    like_type: 'Type',
    like_target: 'Target',
    
    // Follow info
    follow_info: 'Follow Information',
    follow_id: 'Follow ID',
    follow_follower: 'Follower',
    follow_following: 'Following',
    follow_date: 'Date',
    follow_status: 'Status',
    
    // Friend info
    friend_info: 'Friend Information',
