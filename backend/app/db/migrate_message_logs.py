import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), "..", "..", "nextschool_dev.db")
print("Target DB path:", os.path.abspath(db_path))

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

cursor.execute("PRAGMA table_info(message_logs)")
columns = [row[1] for row in cursor.fetchall()]
print("Current columns:", columns)

# Check if parent_id is nullable (notnull == 0)
cursor.execute("PRAGMA table_info(message_logs)")
parent_id_info = [r for r in cursor.fetchall() if r[1] == "parent_id"]
parent_id_notnull = parent_id_info[0][3] if parent_id_info else 1

if parent_id_notnull == 1:
    print("Recreating message_logs table to allow nullable parent_id and support teacher_id...")
    cursor.execute("""
    CREATE TABLE message_logs_new (
        id VARCHAR(36) PRIMARY KEY,
        school_id VARCHAR(36),
        sender_id VARCHAR(36) NOT NULL,
        student_id VARCHAR(36),
        parent_id VARCHAR(36),
        teacher_id VARCHAR(36),
        recipient_type VARCHAR(50) DEFAULT 'parent' NOT NULL,
        recipient_name VARCHAR(255),
        recipient_phone VARCHAR(50),
        template_category VARCHAR(100) NOT NULL,
        language VARCHAR(20) DEFAULT 'en' NOT NULL,
        rendered_message TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'queued' NOT NULL,
        whatsapp_message_id VARCHAR(100),
        error_code VARCHAR(50),
        error_description TEXT,
        retry_count INTEGER DEFAULT 0 NOT NULL,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL,
        FOREIGN KEY(school_id) REFERENCES schools(id) ON DELETE CASCADE,
        FOREIGN KEY(sender_id) REFERENCES users(id),
        FOREIGN KEY(student_id) REFERENCES students(id),
        FOREIGN KEY(parent_id) REFERENCES parents(id),
        FOREIGN KEY(teacher_id) REFERENCES teachers(id)
    )
    """)
    cursor.execute("""
    INSERT INTO message_logs_new (id, school_id, sender_id, student_id, parent_id, template_category, language, rendered_message, status, whatsapp_message_id, error_code, error_description, retry_count, created_at, updated_at)
    SELECT id, school_id, sender_id, student_id, parent_id, template_category, language, rendered_message, status, whatsapp_message_id, error_code, error_description, retry_count, created_at, updated_at FROM message_logs
    """)
    cursor.execute("DROP TABLE message_logs")
    cursor.execute("ALTER TABLE message_logs_new RENAME TO message_logs")
    conn.commit()
    print("Migration successful! parent_id is now nullable and teacher_id/recipient fields added.")
else:
    print("message_logs already migrated.")

conn.close()
