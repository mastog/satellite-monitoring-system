/**
 * Populates the development database with a coherent starter dataset.
 * The script creates a fixed roster of users, community posts, comments, and
 * votes so the application can render realistic activity immediately after a
 * fresh database reset.
 */
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

// Generates deterministic pseudo-random values so repeated seed runs produce
// the same data distribution and counts.
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ACCOUNTS = [
  {
    email: "alex.orbital@sms.io",
    name: "Alex Orbital",
    password: "Orbit2024!",
  },
  { email: "sara.stellar@sms.io", name: "Sara Stellar", password: "Star2024!" },
  { email: "kai.cosmos@sms.io", name: "Kai Cosmos", password: "Cosmo2024!" },
  { email: "luna.space@sms.io", name: "Luna Space", password: "Luna2024!" },
  { email: "max.newton@sms.io", name: "Max Newton", password: "Grav2024!" },
  {
    email: "zara.horizon@sms.io",
    name: "Zara Horizon",
    password: "Horiz2024!",
  },
  { email: "leo.kepler@sms.io", name: "Leo Kepler", password: "Kep2024!" },
  { email: "nova.atlas@sms.io", name: "Nova Atlas", password: "Atlas2024!" },
  {
    email: "iris.solaris@sms.io",
    name: "Iris Solaris",
    password: "Solar2024!",
  },
  { email: "theo.vega@sms.io", name: "Theo Vega", password: "Vega2024!" },
  { email: "maya.aurora@sms.io", name: "Maya Aurora", password: "Auro2024!" },
  { email: "ravi.nebula@sms.io", name: "Ravi Nebula", password: "Nebu2024!" },
  { email: "jade.quasar@sms.io", name: "Jade Quasar", password: "Quas2024!" },
  { email: "finn.zenith@sms.io", name: "Finn Zenith", password: "Zeni2024!" },
  { email: "aria.pulsar@sms.io", name: "Aria Pulsar", password: "Puls2024!" },
  { email: "owen.eclipse@sms.io", name: "Owen Eclipse", password: "Ecli2024!" },
  { email: "mila.comet@sms.io", name: "Mila Comet", password: "Come2024!" },
  { email: "dante.orbit@sms.io", name: "Dante Orbit", password: "DOrb2024!" },
  { email: "cleo.galaxy@sms.io", name: "Cleo Galaxy", password: "Gala2024!" },
  { email: "nash.photon@sms.io", name: "Nash Photon", password: "Phot2024!" },
  {
    email: "ivy.perihelion@sms.io",
    name: "Ivy Perihelion",
    password: "Peri2024!",
  },
  { email: "cyrus.apogee@sms.io", name: "Cyrus Apogee", password: "Apog2024!" },
  { email: "freya.corona@sms.io", name: "Freya Corona", password: "Coro2024!" },
  {
    email: "hiro.altitude@sms.io",
    name: "Hiro Altitude",
    password: "Alti2024!",
  },
  {
    email: "selene.parallax@sms.io",
    name: "Selene Parallax",
    password: "Para2024!",
  },
  {
    email: "bjorn.lagrange@sms.io",
    name: "Bjorn Lagrange",
    password: "Lagr2024!",
  },
  {
    email: "amara.transit@sms.io",
    name: "Amara Transit",
    password: "Tran2024!",
  },
  { email: "dex.plasma@sms.io", name: "Dex Plasma", password: "Plas2024!" },
  { email: "noor.radiant@sms.io", name: "Noor Radiant", password: "Radi2024!" },
  {
    email: "piper.libration@sms.io",
    name: "Piper Libration",
    password: "Libr2024!",
  },
  { email: "taro.umbra@sms.io", name: "Taro Umbra", password: "Umbr2024!" },
  {
    email: "yuki.spectrum@sms.io",
    name: "Yuki Spectrum",
    password: "Spec2024!",
  },
  { email: "lena.doppler@sms.io", name: "Lena Doppler", password: "Dopp2024!" },
  { email: "kai.redshift@sms.io", name: "Kai Redshift", password: "Reds2024!" },
  {
    email: "juno.solstice@sms.io",
    name: "Juno Solstice",
    password: "Sols2024!",
  },
];

const SEED_POSTS = [
  {
    title: "ISS visible pass tonight — best viewing angle from Europe",
    body: "The ISS will make a magnitude -3.8 pass over Central Europe tonight at 21:14 UTC. Max elevation 78° from Berlin. Clear skies expected in most of Germany and Poland. Set your trackers!",
    tags: ["ISS", "Visible Pass", "Europe"],
  },
  {
    title: "Sentinel-2 data showing rapid glacial retreat in the Himalayas",
    body: "Compared imagery from 2020 and 2025 — the Gangotri glacier has retreated another 340m. The false-colour composites make the loss devastatingly clear. SDG 13 relevance is obvious.",
    tags: ["SDG 13", "Glaciers", "Sentinel-2", "Climate"],
  },
  {
    title: "New Starlink launch increasing debris collision risk?",
    body: "With the latest batch bringing total Starlink count above 6,000, conjunction warnings for other operators have spiked 18% this quarter. Is SpaceX doing enough for space sustainability?",
    tags: ["Starlink", "Space Debris", "Sustainability"],
  },
  {
    title:
      "Tutorial: Using satellite.js to propagate TLE orbits in the browser",
    body: "I put together a step-by-step guide for anyone wanting to compute real satellite positions from TLE data using the satellite.js library. SGP4 propagation runs surprisingly fast in JavaScript.",
    tags: ["Tutorial", "satellite.js", "SGP4", "Development"],
  },
  {
    title: "GOES-16 captured an incredible hurricane formation timelapse",
    body: "The GOES-16 ABI instrument recorded Hurricane Mateo's rapid intensification from Cat 1 to Cat 4 in just 18 hours. The eye wall replacement cycle is textbook. Link to full-res imagery in comments.",
    tags: ["GOES-16", "Hurricane", "Weather"],
  },
  {
    title:
      "SDG 6 monitoring: GRACE-FO reveals alarming groundwater depletion in India",
    body: "The latest GRACE-FO gravity anomaly maps show northwest India's aquifer is depleting at 2.4 cm/year equivalent water thickness. At this rate, critical shortages are only a decade away.",
    tags: ["SDG 6", "GRACE-FO", "Water", "India"],
  },
  {
    title: "Tiangong station crew conducting Earth observation experiments",
    body: "The Shenzhou-19 crew is running a 30-day hyperspectral imaging campaign from Tiangong. Their target areas include the Yangtze River delta and the Sahel region for desertification monitoring.",
    tags: ["Tiangong", "Hyperspectral", "Earth Observation"],
  },
  {
    title: "Opinion: We need better international space debris regulations",
    body: "The current 25-year deorbit guideline is insufficient. With mega-constellations deploying thousands of satellites, we need binding international treaties with real enforcement mechanisms and financial penalties.",
    tags: ["Space Debris", "Policy", "Regulations"],
  },
  {
    title:
      "Landsat 9 thermal data shows urban heat islands worsening in megacities",
    body: "Analyzed Landsat 9 TIRS-2 data for 12 megacities over summer 2025. Average UHI intensity increased 1.2°C compared to 2020 baseline. Tokyo and Delhi show the most dramatic changes.",
    tags: ["SDG 11", "Landsat 9", "Urban Heat", "Climate"],
  },
  {
    title: "Has anyone tracked the NOAA-19 anomaly last week?",
    body: "NOAA-19 showed unusual attitude oscillations around Feb 10. Some TLE updates suggest a possible micrometeorite impact. Anyone monitoring this satellite have telemetry insights?",
    tags: ["NOAA-19", "Anomaly", "Telemetry"],
  },
  {
    title: "How satellite data is helping map illegal mining in the Amazon",
    body: "Sentinel-1 SAR change detection reveals over 2,300 new illegal mining sites in the Brazilian Amazon since 2024. The radar data works through cloud cover, making it perfect for tropical monitoring.",
    tags: ["SDG 15", "Mining", "SAR", "Amazon"],
  },
  {
    title: "Hubble's latest deep field image is breathtaking",
    body: "After 30+ years in orbit, Hubble still delivers. The latest ultra-deep field exposure reveals galaxies from just 500 million years after the Big Bang. Incredible that this telescope keeps producing science.",
    tags: ["Hubble", "Deep Field", "Astronomy"],
  },
  {
    title: "Community satellite tracking meetup — February 28 virtual event",
    body: "Hosting a virtual meetup for satellite tracking enthusiasts. We'll cover TLE interpretation, pass prediction tools, and live tracking demos. All skill levels welcome. Sign up link in my profile.",
    tags: ["Community", "Meetup", "Tracking"],
  },
  {
    title: "New OCO-3 data confirms city-level CO2 emission hotspots",
    body: "OCO-3 measurements from the ISS now resolve CO2 enhancements down to individual power plants and industrial districts. The data validates bottom-up emission inventories with R² > 0.91.",
    tags: ["SDG 13", "OCO-3", "CO2", "Emissions"],
  },
  {
    title: "Comparing free satellite imagery sources for SDG research",
    body: "Put together a comparison of free EO data: Sentinel (ESA), Landsat (USGS), MODIS (NASA), and Planet NICFI. Sentinel-2 wins for resolution, MODIS for temporal coverage, Planet for tropics.",
    tags: ["SDG", "Open Data", "Comparison", "Research"],
  },
];

const SEED_COMMENTS = [
  "Great analysis! The data really speaks for itself.",
  "I've been tracking this for months — your observations match mine exactly.",
  "Can you share the processing pipeline you used? Would love to replicate this.",
  "This is exactly why we need better international cooperation on space sustainability.",
  "The temporal resolution improvements in the latest sensors are game-changing.",
  "Fascinating results. Have you considered cross-referencing with MODIS data?",
  "We presented similar findings at AGU last December. Happy to collaborate!",
  "The policy implications here are huge. Thanks for highlighting this.",
  "I disagree with the methodology — sample size seems too small for these conclusions.",
  "Incredible work. This deserves more visibility in the community.",
  "Just started learning about satellite tracking. This is really helpful, thanks!",
  "The error margins should be noted. SAR data in mountainous terrain has known biases.",
  "How does this compare to the ESA Climate Change Initiative datasets?",
  "Strong evidence. I've forwarded this to our research group at the university.",
  "Would be interesting to see this analysis extended to Southeast Asia.",
  "The correlation with ground-truth measurements is impressive.",
  "I ran a similar analysis using Google Earth Engine. Results are consistent.",
  "This is why citizen science and open data matter. Great contribution!",
  "The visualisation could use some work, but the underlying data is solid.",
  "Has anyone managed to automate this workflow? Manual processing is tedious.",
  "Really important finding for SDG reporting. UN ESCAP should see this.",
  "Checked the TLE data — confirmed the anomaly. Likely a debris event.",
  "Our team just published a preprint with complementary results. DOI in my profile.",
  "The sensor calibration drift between 2020 and 2025 should be accounted for.",
  "Excellent tutorial! Got it working on my first try.",
  "Looking forward to the meetup! Will you be covering radio amateur satellite ops?",
  "The economic implications of these findings are staggering.",
  "Please consider submitting this to Remote Sensing of Environment journal.",
  "I noticed similar patterns over sub-Saharan Africa. The trend is global.",
  "Great community post. This kind of engagement is what makes this platform valuable.",
];

const SDG_TARGETS = [
  { targetId: "sdg-6", targetType: "sdg", supportBias: 0.75 },
  { targetId: "sdg-9", targetType: "sdg", supportBias: 0.5 },
  { targetId: "sdg-11", targetType: "sdg", supportBias: 0.72 },
  { targetId: "sdg-12", targetType: "sdg", supportBias: 0.55 },
  { targetId: "sdg-13", targetType: "sdg", supportBias: 0.82 },
  { targetId: "sdg-15", targetType: "sdg", supportBias: 0.8 },
];

const ARTICLE_TARGETS = Array.from({ length: 20 }, (_, i) => ({
  targetId: `article-${i + 1}`,
  targetType: "article",
  supportBias: 0.65 + Math.sin(i * 1.3) * 0.15,
}));

const PAPER_TARGETS = Array.from({ length: 12 }, (_, i) => ({
  targetId: `paper-p${i + 1}`,
  targetType: "paper",
  supportBias: 0.75 + Math.sin(i * 2.1) * 0.12,
}));

const INDICATOR_TARGETS = [
  {
    targetId: "sdg-6-water-body-area",
    targetType: "indicator",
    supportBias: 0.8,
  },
  {
    targetId: "sdg-6-water-quality",
    targetType: "indicator",
    supportBias: 0.78,
  },
  {
    targetId: "sdg-6-precipitation",
    targetType: "indicator",
    supportBias: 0.82,
  },
  { targetId: "sdg-6-groundwater", targetType: "indicator", supportBias: 0.76 },
  {
    targetId: "sdg-9-nightlight-growth",
    targetType: "indicator",
    supportBias: 0.52,
  },
  {
    targetId: "sdg-9-road-density",
    targetType: "indicator",
    supportBias: 0.55,
  },
  {
    targetId: "sdg-9-urban-infrastructure",
    targetType: "indicator",
    supportBias: 0.48,
  },
  {
    targetId: "sdg-9-connectivity",
    targetType: "indicator",
    supportBias: 0.65,
  },
  {
    targetId: "sdg-11-urban-expansion",
    targetType: "indicator",
    supportBias: 0.7,
  },
  {
    targetId: "sdg-11-green-space",
    targetType: "indicator",
    supportBias: 0.85,
  },
  {
    targetId: "sdg-11-air-quality",
    targetType: "indicator",
    supportBias: 0.72,
  },
  {
    targetId: "sdg-11-heat-island",
    targetType: "indicator",
    supportBias: 0.68,
  },
  {
    targetId: "sdg-12-waste-sites",
    targetType: "indicator",
    supportBias: 0.55,
  },
  {
    targetId: "sdg-12-mining-impact",
    targetType: "indicator",
    supportBias: 0.5,
  },
  {
    targetId: "sdg-12-agricultural-eff",
    targetType: "indicator",
    supportBias: 0.65,
  },
  {
    targetId: "sdg-12-deforestation-prod",
    targetType: "indicator",
    supportBias: 0.58,
  },
  {
    targetId: "sdg-13-temperature-anomaly",
    targetType: "indicator",
    supportBias: 0.82,
  },
  { targetId: "sdg-13-sea-level", targetType: "indicator", supportBias: 0.85 },
  {
    targetId: "sdg-13-ice-coverage",
    targetType: "indicator",
    supportBias: 0.8,
  },
  {
    targetId: "sdg-13-carbon-emissions",
    targetType: "indicator",
    supportBias: 0.78,
  },
  {
    targetId: "sdg-15-vegetation-ndvi",
    targetType: "indicator",
    supportBias: 0.82,
  },
  {
    targetId: "sdg-15-forest-loss",
    targetType: "indicator",
    supportBias: 0.75,
  },
  {
    targetId: "sdg-15-biodiversity-proxy",
    targetType: "indicator",
    supportBias: 0.8,
  },
  {
    targetId: "sdg-15-soil-degradation",
    targetType: "indicator",
    supportBias: 0.72,
  },
];

const CONTENT_TARGETS = [
  ...SDG_TARGETS,
  ...ARTICLE_TARGETS,
  ...PAPER_TARGETS,
  ...INDICATOR_TARGETS,
];

async function main() {
  const rng = mulberry32(42);

  console.log("Seeding database...\n");

  // Creates the user roster first so later records can safely reference valid
  // author and voter IDs.
  const users: { id: string; name: string; email: string }[] = [];
  for (const acct of ACCOUNTS) {
    const passwordHash = await hash(acct.password, 10);
    const user = await prisma.user.upsert({
      where: { email: acct.email },
      update: {},
      create: {
        email: acct.email,
        name: acct.name,
        passwordHash,
        createdAt: new Date(Date.now() - Math.floor(rng() * 30 * 86400000)),
      },
    });
    users.push(user);
    console.log(`  user: ${acct.email}`);
  }
  console.log(`\nUsers: ${users.length}\n`);

  // Creates posts with varied timestamps so feed and dashboard views render a
  // believable range of recent activity.
  const posts: { id: string; authorId: string }[] = [];
  for (let i = 0; i < SEED_POSTS.length; i++) {
    const author = users[Math.floor(rng() * users.length)];
    const daysAgo = Math.floor(rng() * 14);
    const createdAt = new Date(
      Date.now() - daysAgo * 86400000 - Math.floor(rng() * 86400000)
    );
    const post = await prisma.post.create({
      data: {
        authorId: author.id,
        authorName: author.name,
        title: SEED_POSTS[i].title,
        body: SEED_POSTS[i].body,
        tags: JSON.stringify(SEED_POSTS[i].tags),
        createdAt,
        updatedAt: createdAt,
      },
    });
    posts.push(post);
  }
  console.log(`Posts: ${posts.length}\n`);

  // Adds comments after posts exist so each seeded discussion thread has
  // follow-up activity from multiple users.
  const comments: { id: string; authorId: string; createdAt: Date }[] = [];
  let commentIdx = 0;
  for (const post of posts) {
    const numComments = 1 + Math.floor(rng() * 3);
    for (let j = 0; j < numComments && commentIdx < SEED_COMMENTS.length; j++) {
      let commenter;
      do {
        commenter = users[Math.floor(rng() * users.length)];
      } while (commenter.id === post.authorId && users.length > 1);

      const hoursAfterPost = 1 + Math.floor(rng() * 72);
      const createdAt = new Date(
        Date.now() - Math.floor(rng() * 7 * 86400000) + hoursAfterPost * 3600000
      );
      const comment = await prisma.comment.create({
        data: {
          postId: post.id,
          authorId: commenter.id,
          authorName: commenter.name,
          body: SEED_COMMENTS[commentIdx],
          createdAt,
          updatedAt: createdAt,
        },
      });
      comments.push(comment);
      commentIdx++;
    }
  }
  console.log(`Comments: ${comments.length}\n`);

  // Creates vote records last so every vote target already exists when the
  // engagement data is generated.
  let voteCount = 0;

  // Adds votes for SDGs, articles, papers, and indicators so non-post content
  // also has engagement data from the start.
  for (const user of users) {
    const numVotes = 6 + Math.floor(rng() * 7);
    const shuffled = [...CONTENT_TARGETS].sort(() => rng() - 0.5);
    const targets = shuffled.slice(0, numVotes);

    for (const target of targets) {
      const isSupport = rng() < target.supportBias;
      try {
        await prisma.vote.create({
          data: {
            userId: user.id,
            targetId: target.targetId,
            targetType: target.targetType,
            vote: isSupport ? "support" : "oppose",
          },
        });
        voteCount++;
      } catch {
        // Skips duplicate combinations that would violate the unique vote constraint.
      }
    }
  }

  // Adds post votes so the community feed starts with visible support and
  // opposition counts.
  for (const user of users) {
    const numPostVotes = 5 + Math.floor(rng() * 6);
    const shuffledPosts = [...posts].sort(() => rng() - 0.5);
    const targetPosts = shuffledPosts.slice(
      0,
      Math.min(numPostVotes, posts.length)
    );

    for (const post of targetPosts) {
      if (post.authorId === user.id) continue;
      const supportBias = 0.55 + rng() * 0.2;
      const isSupport = rng() < supportBias;
      try {
        await prisma.vote.create({
          data: {
            userId: user.id,
            targetId: post.id,
            targetType: "post",
            vote: isSupport ? "support" : "oppose",
          },
        });
        voteCount++;
      } catch {
        // Skips duplicate combinations that would violate the unique vote constraint.
      }
    }
  }

  // Adds comment votes so discussion threads also show realistic engagement.
  for (const user of users) {
    const numCommentVotes = 3 + Math.floor(rng() * 6);
    const shuffledComments = [...comments].sort(() => rng() - 0.5);
    const targetComments = shuffledComments.slice(
      0,
      Math.min(numCommentVotes, comments.length)
    );

    for (const comment of targetComments) {
      if (comment.authorId === user.id) continue;
      const supportBias = 0.6 + rng() * 0.2;
      const isSupport = rng() < supportBias;
      try {
        await prisma.vote.create({
          data: {
            userId: user.id,
            targetId: comment.id,
            targetType: "comment",
            vote: isSupport ? "support" : "oppose",
          },
        });
        voteCount++;
      } catch {
        // Skips duplicate combinations that would violate the unique vote constraint.
      }
    }
  }

  console.log(`Votes: ${voteCount}\n`);
  console.log("Done!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
