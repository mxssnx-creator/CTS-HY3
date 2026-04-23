import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";

export async function GET() {
  try {
    const allUsers = await db.select().from(users);
    return NextResponse.json(allUsers);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email } = body;

    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
    }

    const [user] = await db.insert(users).values({ name, email }).returning();
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}
