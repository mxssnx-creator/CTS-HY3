import { NextResponse } from "next/server";
import { db } from "@/db";
import { posts } from "@/db/schema";

export async function GET() {
  try {
    const allPosts = await db.select().from(posts);
    return NextResponse.json(allPosts);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, content, authorId } = body;

    if (!title || !authorId) {
      return NextResponse.json({ error: "Title and authorId are required" }, { status: 400 });
    }

    const [post] = await db.insert(posts).values({ title, content, authorId }).returning();
    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
  }
}
