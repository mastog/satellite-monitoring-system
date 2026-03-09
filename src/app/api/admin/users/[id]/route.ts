import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/middleware";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        _count: { select: { posts: true, comments: true, votes: true } },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        points: user.points,
        totalEarned: user.totalEarned,
        postCount: user._count.posts,
        commentCount: user._count.comments,
        voteCount: user._count.votes,
        createdAt: user.createdAt.toISOString(),
      },
    });
  } catch (err) {
    console.error("Admin users [id] GET error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const updates: {
      name?: string;
      email?: string;
      role?: string;
      points?: number;
    } = await req.json();

    // Cannot demote self
    if (id === admin.id && updates.role && updates.role !== "admin") {
      return NextResponse.json(
        { error: "Cannot change your own role" },
        { status: 400 }
      );
    }

    const data: Record<string, unknown> = {};
    if (updates.name) data.name = updates.name;
    if (updates.email) data.email = updates.email;
    if (updates.role && (updates.role === "admin" || updates.role === "user")) {
      data.role = updates.role;
    }
    if (typeof updates.points === "number") data.points = updates.points;

    const user = await prisma.user.update({ where: { id }, data });

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        points: user.points,
        createdAt: user.createdAt.toISOString(),
      },
    });
  } catch (err) {
    console.error("Admin users [id] PUT error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const { id } = await params;

    if (id === admin.id) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Cascade delete: votes, comments, posts, tracked satellites, notifications, purchases
    await prisma.$transaction([
      prisma.vote.deleteMany({ where: { userId: id } }),
      prisma.purchase.deleteMany({ where: { userId: id } }),
      prisma.notification.deleteMany({ where: { userId: id } }),
      prisma.trackedSatellite.deleteMany({ where: { userId: id } }),
      prisma.comment.deleteMany({ where: { authorId: id } }),
      prisma.post.deleteMany({ where: { authorId: id } }),
      prisma.user.delete({ where: { id } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Admin users [id] DELETE error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
