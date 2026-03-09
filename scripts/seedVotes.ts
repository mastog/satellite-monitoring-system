/**
 * Rebuilds vote data for the seeded non-admin accounts without touching real
 * user activity. The script generates votes across articles, papers, SDGs,
 * and indicators with deterministic participation and approval ranges so
 * trend and sentiment visualizations stay realistic in development.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Generates deterministic pseudo-random values so repeated runs produce the
// same participation and approval distribution.
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = mulberry32(1145141919810);

// Defines the baseline participation and approval ratios that each target will
// jitter around before individual votes are generated.
const TARGET_PARTICIPATION = 0.7;
const TARGET_APPROVAL = 0.7;

// Defines how far each target may deviate from the global participation and
// approval baselines while still staying in a believable range.
const PARTICIPATION_JITTER = 0.2;
const APPROVAL_JITTER = 0.2;

// Mirrors the SDG identifiers used by the application so generated votes line
// up with the cards and indicators rendered in the dashboard.
const SDG_NUMBERS = [6, 9, 11, 12, 13, 15];

const INDICATOR_IDS: Record<number, string[]> = {
  6: ["water-body-area", "water-quality", "precipitation", "groundwater"],
  9: [
    "nightlight-growth",
    "road-density",
    "urban-infrastructure",
    "connectivity",
  ],
  11: ["urban-expansion", "green-space", "air-quality", "heat-island"],
  12: [
    "waste-sites",
    "mining-impact",
    "agricultural-eff",
    "deforestation-prod",
  ],
  13: ["temperature-anomaly", "sea-level", "ice-coverage", "carbon-emissions"],
  15: [
    "vegetation-ndvi",
    "forest-loss",
    "biodiversity-proxy",
    "soil-degradation",
  ],
};

// Describes a normalized vote target record used during vote generation.
interface VoteTarget {
  targetId: string;
  targetType: "sdg" | "article" | "paper" | "indicator";
}

// Builds the complete target list that seeded accounts are allowed to vote on.
function buildTargets(articleIds: string[], paperIds: string[]): VoteTarget[] {
  const targets: VoteTarget[] = [];

  // Adds top-level SDG topics so the overview cards receive engagement data.
  for (const sdg of SDG_NUMBERS) {
    targets.push({ targetId: `sdg-${sdg}`, targetType: "sdg" });
  }

  // Adds indicator-level targets so detailed SDG views also have votes.
  for (const sdg of SDG_NUMBERS) {
    for (const indId of INDICATOR_IDS[sdg]) {
      targets.push({
        targetId: `sdg-${sdg}-${indId}`,
        targetType: "indicator",
      });
    }
  }

  // Adds science article targets used by the science and community views.
  for (const id of articleIds) {
    targets.push({ targetId: `article-${id}`, targetType: "article" });
  }

  // Adds paper targets used by the science and community views.
  for (const id of paperIds) {
    targets.push({ targetId: `paper-${id}`, targetType: "paper" });
  }

  return targets;
}

// Spreads vote timestamps over the last month so the sentiment chart shows a
// time distribution instead of a single insertion spike.
function randomPastDate(): Date {
  const daysAgo = Math.floor(rng() * 30);
  const hoursAgo = Math.floor(rng() * 24);
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(d.getHours() - hoursAgo);
  return d;
}

// Lists the seeded accounts that this script is allowed to modify.
// Votes from real users are intentionally preserved.
const SEED_EMAILS = [
  "alex.orbital@sms.io",
  "sara.stellar@sms.io",
  "kai.cosmos@sms.io",
  "luna.space@sms.io",
  "max.newton@sms.io",
  "zara.horizon@sms.io",
  "leo.kepler@sms.io",
  "nova.atlas@sms.io",
  "iris.solaris@sms.io",
  "theo.vega@sms.io",
  "maya.aurora@sms.io",
  "ravi.nebula@sms.io",
  "jade.quasar@sms.io",
  "finn.zenith@sms.io",
  "aria.pulsar@sms.io",
  "owen.eclipse@sms.io",
  "mila.comet@sms.io",
  "dante.orbit@sms.io",
  "cleo.galaxy@sms.io",
  "nash.photon@sms.io",
  "ivy.perihelion@sms.io",
  "cyrus.apogee@sms.io",
  "freya.corona@sms.io",
  "hiro.altitude@sms.io",
  "selene.parallax@sms.io",
  "bjorn.lagrange@sms.io",
  "amara.transit@sms.io",
  "dex.plasma@sms.io",
  "noor.radiant@sms.io",
  "piper.libration@sms.io",
  "taro.umbra@sms.io",
  "yuki.spectrum@sms.io",
  "lena.doppler@sms.io",
  "kai.redshift@sms.io",
  "juno.solstice@sms.io",
];

// Runs the vote-regeneration workflow from account lookup through summary logging.
async function main() {
  // Loads only the controlled seed accounts so real users are excluded from changes.
  const seedUsers = await prisma.user.findMany({
    where: { email: { in: SEED_EMAILS } },
    select: { id: true, name: true },
  });
  console.log(`Seed users: ${seedUsers.length}`);

  if (seedUsers.length === 0) {
    console.error("No seed accounts found. Run `pnpm db:seed` first.");
    process.exit(1);
  }

  const seedUserIds = seedUsers.map((u) => u.id);

  // Clears only the existing votes created by seed accounts so the script can
  // rebuild them from scratch without affecting authentic user activity.
  const deleteResult = await prisma.vote.deleteMany({
    where: { userId: { in: seedUserIds } },
  });
  console.log(`Cleared ${deleteResult.count} seed-account votes`);

  // Reads article and paper IDs from the current cache tables so new votes
  // align with whatever synced content is available.
  const articles = await prisma.articleCache.findMany({ select: { id: true } });
  const papers = await prisma.paperCache.findMany({ select: { id: true } });

  // Adds the mock IDs referenced by CommunityHub so the development UI keeps
  // working even when remote sync tables are sparse.
  const articleIds = [
    ...articles.map((a) => a.id),
    ...Array.from({ length: 20 }, (_, i) => String(i + 1)),
  ];
  const paperIds = [
    ...papers.map((p) => p.id),
    ...Array.from({ length: 12 }, (_, i) => `p${i + 1}`),
  ];

  // Removes duplicates before building the final target list.
  const uniqueArticleIds = [...new Set(articleIds)];
  const uniquePaperIds = [...new Set(paperIds)];

  const targets = buildTargets(uniqueArticleIds, uniquePaperIds);
  console.log(
    `Vote targets: ${targets.length} (${SDG_NUMBERS.length} SDGs, ${SDG_NUMBERS.length * 4} indicators, ${uniqueArticleIds.length} articles, ${uniquePaperIds.length} papers)`
  );

  // Generates vote records using target-level participation and approval
  // ranges computed from the global baselines above.
  let totalCreated = 0;
  let totalSupport = 0;
  let totalOppose = 0;

  // Precomputes per-target rates once so all users voting on the same target
  // share a consistent macro distribution.
  const targetRates = targets.map((t) => ({
    ...t,
    participation: Math.max(
      0.3,
      Math.min(
        0.95,
        TARGET_PARTICIPATION + (rng() - 0.5) * 2 * PARTICIPATION_JITTER
      )
    ),
    approval: Math.max(
      0.25,
      Math.min(0.92, TARGET_APPROVAL + (rng() - 0.5) * 2 * APPROVAL_JITTER)
    ),
  }));

  // Accumulates votes in memory so they can be inserted in SQLite-safe batches.
  const votesToCreate: {
    id: string;
    userId: string;
    targetId: string;
    targetType: string;
    vote: string;
    createdAt: Date;
  }[] = [];

  for (const target of targetRates) {
    for (const user of seedUsers) {
      // Skips this user-target pair when the sampled participation threshold is not met.
      if (rng() > target.participation) continue;

      // Picks support or oppose according to the target-specific approval rate.
      const vote = rng() < target.approval ? "support" : "oppose";

      votesToCreate.push({
        id: crypto.randomUUID(),
        userId: user.id,
        targetId: target.targetId,
        targetType: target.targetType,
        vote,
        createdAt: randomPastDate(),
      });

      if (vote === "support") totalSupport++;
      else totalOppose++;
      totalCreated++;
    }
  }

  // Inserts votes with raw SQL because this seed workload is faster and more
  // reliable than large Prisma createMany batches against SQLite.
  console.log(`  Inserting ${votesToCreate.length} votes...`);
  const BATCH = 50; // Keeps each batch comfortably below SQLite's 999-parameter limit.
  for (let i = 0; i < votesToCreate.length; i += BATCH) {
    const chunk = votesToCreate.slice(i, i + BATCH);
    const placeholders = chunk.map(() => "(?, ?, ?, ?, ?, ?)").join(", ");
    const values = chunk.flatMap((v) => [
      v.id,
      v.userId,
      v.targetId,
      v.targetType,
      v.vote,
      v.createdAt.toISOString(),
    ]);
    await prisma.$executeRawUnsafe(
      `INSERT OR IGNORE INTO votes (id, user_id, target_id, target_type, vote, created_at) VALUES ${placeholders}`,
      ...values
    );
    if (i % 2000 === 0) {
      process.stdout.write(
        `\r  Inserting... ${Math.min(i + BATCH, votesToCreate.length)}/${votesToCreate.length}`
      );
    }
  }
  console.log(
    `\r  Inserted ${votesToCreate.length} votes.                    `
  );

  // Recomputes points so each seeded user's score remains consistent with the
  // votes that were just generated.
  const userVoteCounts: Record<string, number> = {};
  for (const v of votesToCreate) {
    userVoteCounts[v.userId] = (userVoteCounts[v.userId] || 0) + 1;
  }
  for (const [userId, voteCount] of Object.entries(userVoteCounts)) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        points: { increment: voteCount },
        totalEarned: { increment: voteCount },
      },
    });
  }

  // Logs the resulting distribution so developers can verify the generated data.
  const actualApproval =
    totalCreated > 0 ? ((totalSupport / totalCreated) * 100).toFixed(1) : "0";
  const actualParticipation = (
    (totalCreated / (seedUsers.length * targets.length)) *
    100
  ).toFixed(1);

  console.log(`\nDone!`);
  console.log(`  Total votes created: ${totalCreated.toLocaleString()}`);
  console.log(
    `  Support: ${totalSupport.toLocaleString()} | Oppose: ${totalOppose.toLocaleString()}`
  );
  console.log(
    `  Actual approval rate: ${actualApproval}%  (target: ${(TARGET_APPROVAL * 100).toFixed(0)}%)`
  );
  console.log(
    `  Actual participation rate: ${actualParticipation}%  (target: ${(TARGET_PARTICIPATION * 100).toFixed(0)}%)`
  );
  console.log(
    `  User points updated for ${Object.keys(userVoteCounts).length} users`
  );

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
