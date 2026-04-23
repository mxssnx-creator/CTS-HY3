import { db } from "@/db";
import { users, posts } from "@/db/schema";

async function getStats() {
  const allUsers = await db.select().from(users);
  const allPosts = await db.select().from(posts);

  return {
    users: allUsers.length,
    posts: allPosts.length,
  };
}

export default async function Home() {
  const stats = await getStats();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold mb-8">CTS-HY3 Project</h1>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="p-4 border rounded-lg">
            <h2 className="text-2xl font-semibold">{stats.users}</h2>
            <p className="text-gray-600">Users</p>
          </div>
          <div className="p-4 border rounded-lg">
            <h2 className="text-2xl font-semibold">{stats.posts}</h2>
            <p className="text-gray-600">Posts</p>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-semibold">API Endpoints</h3>
          <ul className="list-disc list-inside space-y-2">
            <li><code>GET /api/users</code> - List all users</li>
            <li><code>POST /api/users</code> - Create a new user</li>
            <li><code>GET /api/posts</code> - List all posts</li>
            <li><code>POST /api/posts</code> - Create a new post</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
