import { neon } from "@neondatabase/serverless";
import { hashPassword, UserRole, UserSession } from "./auth";

export interface UserRecord extends UserSession {
  password_hash: string;
  created_at?: string;
  last_login_at?: string | null;
}

// Default Demo Accounts specified in the problem statement
export const DEMO_ACCOUNTS = [
  {
    name: "Prof. Alok Sharma (Dean Academic)",
    email: "admin@cit.edu.in",
    password: "citadmin2026",
    role: "admin" as UserRole,
    department: "Dean's Office",
  },
  {
    name: "Dr. Sunita Mohanty",
    email: "coordinator.cse@cit.edu.in",
    password: "citcoord2026",
    role: "coordinator" as UserRole,
    department: "Computer Science & Engineering",
  },
  {
    name: "Dr. Rajesh Tripathy",
    email: "faculty.ece@cit.edu.in",
    password: "citfaculty2026",
    role: "faculty" as UserRole,
    department: "Electronics & Communication",
  },
  {
    name: "Priyansh Verma (Spectra Fest Lead)",
    email: "club.spectra@cit.edu.in",
    password: "citclub2026",
    role: "club_rep" as UserRole,
    department: "Student Council / Spectra",
  },
];

// In-memory fallback if DATABASE_URL is not yet configured
let memoryUsers: UserRecord[] = [];

async function getHashedDemoAccounts(): Promise<UserRecord[]> {
  const list: UserRecord[] = [];
  for (let i = 0; i < DEMO_ACCOUNTS.length; i++) {
    const acc = DEMO_ACCOUNTS[i];
    const password_hash = await hashPassword(acc.password);
    list.push({
      id: i + 1,
      name: acc.name,
      email: acc.email,
      password_hash,
      role: acc.role,
      department: acc.department,
    });
  }
  return list;
}

export function isNeonConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith("postgres"));
}

export function getDbClient() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return null;
  }
  return neon(dbUrl);
}

export async function initDatabase(): Promise<{ status: "neon" | "memory"; message: string }> {
  const sql = getDbClient();

  if (!sql) {
    if (memoryUsers.length === 0) {
      memoryUsers = await getHashedDemoAccounts();
    }
    return {
      status: "memory",
      message: "DATABASE_URL not configured. Running with in-memory demo store. Set DATABASE_URL in .env.local to persist in Neon DB.",
    };
  }

  try {
    // Create users table in Neon Postgres
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'coordinator', 'faculty', 'club_rep')),
        department VARCHAR(150),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        last_login_at TIMESTAMP WITH TIME ZONE
      );
    `;

    // Check if demo users exist; insert if missing
    for (const demo of DEMO_ACCOUNTS) {
      const existing = await sql`SELECT id FROM users WHERE email = ${demo.email} LIMIT 1`;
      if (existing.length === 0) {
        const password_hash = await hashPassword(demo.password);
        await sql`
          INSERT INTO users (name, email, password_hash, role, department)
          VALUES (${demo.name}, ${demo.email}, ${password_hash}, ${demo.role}, ${demo.department});
        `;
      }
    }

    return {
      status: "neon",
      message: "Neon DB connected and initialized successfully.",
    };
  } catch (error) {
    console.error("Neon DB init error, using memory fallback:", error);
    if (memoryUsers.length === 0) {
      memoryUsers = await getHashedDemoAccounts();
    }
    return {
      status: "memory",
      message: `Failed to connect to Neon DB: ${(error as Error).message}. Using in-memory store.`,
    };
  }
}

export async function findUserByEmail(email: string): Promise<UserRecord | null> {
  const normalizedEmail = email.trim().toLowerCase();
  const sql = getDbClient();

  if (sql) {
    try {
      await initDatabase();
      const rows = await sql`
        SELECT id, name, email, password_hash, role, department, created_at, last_login_at
        FROM users
        WHERE LOWER(email) = ${normalizedEmail}
        LIMIT 1
      `;
      if (rows.length > 0) {
        const r = rows[0];
        return {
          id: r.id,
          name: r.name,
          email: r.email,
          password_hash: r.password_hash,
          role: r.role as UserRole,
          department: r.department,
          created_at: r.created_at,
          last_login_at: r.last_login_at,
        };
      }
      return null;
    } catch (e) {
      console.warn("Neon query failed, falling back to memory:", e);
    }
  }

  // Memory fallback
  if (memoryUsers.length === 0) {
    memoryUsers = await getHashedDemoAccounts();
  }
  const match = memoryUsers.find((u) => u.email.toLowerCase() === normalizedEmail);
  return match || null;
}

export async function createUser(data: {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  department?: string | null;
}): Promise<{ success: boolean; user?: UserSession; error?: string }> {
  const normalizedEmail = data.email.trim().toLowerCase();
  const existing = await findUserByEmail(normalizedEmail);
  if (existing) {
    return { success: false, error: "An account with this email already exists." };
  }

  const password_hash = await hashPassword(data.password);
  const sql = getDbClient();

  if (sql) {
    try {
      await initDatabase();
      const rows = await sql`
        INSERT INTO users (name, email, password_hash, role, department)
        VALUES (${data.name.trim()}, ${normalizedEmail}, ${password_hash}, ${data.role}, ${data.department || null})
        RETURNING id, name, email, role, department;
      `;
      if (rows.length > 0) {
        const u = rows[0];
        return {
          success: true,
          user: {
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role as UserRole,
            department: u.department,
          },
        };
      }
    } catch (err) {
      console.error("Failed to create user in Neon:", err);
      return { success: false, error: "Database error while creating user." };
    }
  }

  // Memory fallback
  const newId = memoryUsers.length + 1;
  const newRecord: UserRecord = {
    id: newId,
    name: data.name.trim(),
    email: normalizedEmail,
    password_hash,
    role: data.role,
    department: data.department || null,
  };
  memoryUsers.push(newRecord);

  return {
    success: true,
    user: {
      id: newRecord.id,
      name: newRecord.name,
      email: newRecord.email,
      role: newRecord.role,
      department: newRecord.department,
    },
  };
}

export async function updateLastLogin(id: number | string): Promise<void> {
  const sql = getDbClient();
  if (sql && typeof id === "number") {
    try {
      await sql`UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ${id}`;
    } catch (e) {
      console.warn("Failed to update last_login_at in Neon:", e);
    }
  }
}

export async function resetDemoDatabase(): Promise<{ success: boolean; message: string }> {
  const sql = getDbClient();
  if (sql) {
    try {
      await sql`DROP TABLE IF EXISTS users CASCADE;`;
      await initDatabase();
      return { success: true, message: "Neon DB reset to clean demo state with all 4 default roles." };
    } catch (error) {
      return { success: false, message: `Reset failed: ${(error as Error).message}` };
    }
  }

  memoryUsers = await getHashedDemoAccounts();
  return { success: true, message: "In-memory database reset to initial demo accounts." };
}
