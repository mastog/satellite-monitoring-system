import { NextResponse } from "next/server";
import { getUsers } from "@/lib/auth/db";
import { getPosts } from "@/lib/posts/db";

export async function GET() {
  try {
    const users = await getUsers();
    const posts = await getPosts();
    return NextResponse.json({
      userCount: users.length,
      postCount: posts.length,
    });
  } catch (err) {
    console.error("Stats API error:", err);
    return NextResponse.json({ userCount: 0, postCount: 0 });
  }
}
