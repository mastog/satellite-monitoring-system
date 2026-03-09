// Stores Chinese-to-English domain terms used by greedy segmentation in satellite and earth-science search.

interface DictEntry {
  zh: string;
  en: string[];
}

const ZH_EN_DICT: DictEntry[] = [
  // Lists compound phrases before short fragments so greedy matching captures the most specific term first.

  // Covers SDG and sustainability vocabulary.
  { zh: "可持续发展目标", en: ["sustainable development goals", "sdg"] },
  { zh: "可持续发展", en: ["sustainable development"] },
  { zh: "清洁饮用水", en: ["clean drinking water"] },
  { zh: "经济适用住房", en: ["affordable housing"] },
  { zh: "可再生能源", en: ["renewable energy"] },
  { zh: "气候变化适应", en: ["climate adaptation"] },
  { zh: "温室气体排放", en: ["greenhouse gas emissions"] },
  { zh: "生物多样性", en: ["biodiversity"] },
  { zh: "循环经济", en: ["circular economy"] },
  { zh: "精准农业", en: ["precision agriculture", "precision farming"] },
  { zh: "粮食安全", en: ["food security"] },
  { zh: "水资源管理", en: ["water resource management"] },
  { zh: "废物管理", en: ["waste management"] },
  { zh: "可持续城市", en: ["sustainable city"] },
  { zh: "绿色空间", en: ["green space"] },

  // Covers climate and atmospheric vocabulary.
  { zh: "全球变暖", en: ["global warming"] },
  { zh: "气候变化", en: ["climate change", "climate crisis"] },
  { zh: "温室效应", en: ["greenhouse effect"] },
  { zh: "温室气体", en: ["greenhouse gas"] },
  { zh: "碳排放量", en: ["carbon emissions"] },
  { zh: "二氧化碳", en: ["carbon dioxide", "co2"] },
  { zh: "臭氧层", en: ["ozone layer"] },
  { zh: "平流层", en: ["stratosphere"] },
  { zh: "对流层", en: ["troposphere"] },
  { zh: "空气污染", en: ["air pollution"] },
  { zh: "空气质量", en: ["air quality"] },
  { zh: "气溶胶", en: ["aerosol"] },
  { zh: "碳排放", en: ["carbon emissions"] },

  // Covers ocean, hydrology, and water-management vocabulary.
  { zh: "海平面上升", en: ["sea level rise"] },
  { zh: "海面温度", en: ["sea surface temperature", "sst"] },
  { zh: "海洋酸化", en: ["ocean acidification"] },
  { zh: "海洋环流", en: ["ocean circulation", "ocean current"] },
  { zh: "珊瑚礁白化", en: ["coral bleaching"] },
  { zh: "塑料污染", en: ["plastic pollution"] },
  { zh: "藻华", en: ["algal bloom"] },
  { zh: "红树林", en: ["mangrove"] },
  { zh: "海平面", en: ["sea level"] },
  { zh: "珊瑚礁", en: ["coral reef", "coral"] },
  { zh: "水循环", en: ["water cycle", "hydrological cycle"] },
  { zh: "地下水", en: ["groundwater", "aquifer"] },
  { zh: "水资源", en: ["water resources"] },
  { zh: "流域", en: ["watershed", "river basin"] },
  { zh: "降水量", en: ["precipitation", "rainfall"] },
  { zh: "淡水", en: ["freshwater"] },
  { zh: "废水", en: ["wastewater"] },
  { zh: "水质", en: ["water quality"] },

  // Covers cryosphere and ice-related vocabulary.
  { zh: "冰盖融化", en: ["ice sheet melting"] },
  { zh: "永久冻土", en: ["permafrost"] },
  { zh: "南极洲", en: ["antarctic", "antarctica"] },
  { zh: "北极圈", en: ["arctic circle"] },
  { zh: "冰川消退", en: ["glacier retreat"] },
  { zh: "海冰", en: ["sea ice"] },
  { zh: "冰盖", en: ["ice sheet", "ice cap"] },
  { zh: "冰川", en: ["glacier"] },
  { zh: "雪线", en: ["snowline", "snowpack"] },
  { zh: "北极", en: ["arctic"] },
  { zh: "南极", en: ["antarctic"] },

  // Covers forests, land cover, and terrestrial ecosystem vocabulary.
  { zh: "森林砍伐", en: ["deforestation", "forest loss"] },
  { zh: "植被覆盖", en: ["vegetation cover"] },
  { zh: "土地退化", en: ["land degradation"] },
  { zh: "土地利用", en: ["land use"] },
  { zh: "荒漠化", en: ["desertification"] },
  { zh: "再造林", en: ["reforestation"] },
  { zh: "植被指数", en: ["vegetation index", "ndvi"] },
  { zh: "生态系统", en: ["ecosystem"] },
  { zh: "野生动物", en: ["wildlife"] },
  { zh: "栖息地", en: ["habitat"] },
  { zh: "植被", en: ["vegetation"] },
  { zh: "森林", en: ["forest"] },
  { zh: "土壤", en: ["soil"] },

  // Covers geology and natural-hazard vocabulary.
  { zh: "火山喷发", en: ["volcanic eruption", "eruption"] },
  { zh: "地震监测", en: ["earthquake monitoring", "seismic monitoring"] },
  { zh: "自然灾害", en: ["natural disaster"] },
  { zh: "山体滑坡", en: ["landslide"] },
  { zh: "洪水监测", en: ["flood monitoring"] },
  { zh: "野火检测", en: ["wildfire detection", "fire detection"] },
  { zh: "地震", en: ["earthquake", "seismic"] },
  { zh: "火山", en: ["volcano", "volcanic"] },
  { zh: "海啸", en: ["tsunami"] },
  { zh: "洪水", en: ["flood"] },
  { zh: "干旱", en: ["drought"] },
  { zh: "野火", en: ["wildfire", "fire"] },

  // Covers satellite missions, instruments, and observation platforms.
  { zh: "合成孔径雷达", en: ["synthetic aperture radar", "sar"] },
  { zh: "多光谱成像", en: ["multispectral imaging", "multispectral"] },
  { zh: "高光谱成像", en: ["hyperspectral imaging", "hyperspectral"] },
  { zh: "热红外成像", en: ["thermal infrared imaging", "thermal imaging"] },
  { zh: "激光雷达", en: ["lidar", "laser altimetry"] },
  { zh: "地球观测", en: ["earth observation"] },
  { zh: "遥感技术", en: ["remote sensing technology"] },
  { zh: "卫星导航", en: ["satellite navigation", "gnss"] },
  { zh: "卫星通信", en: ["satellite communication"] },
  { zh: "卫星星座", en: ["satellite constellation", "constellation"] },
  { zh: "哨兵卫星", en: ["sentinel"] },
  { zh: "陆地卫星", en: ["landsat"] },
  { zh: "气象卫星", en: ["weather satellite", "meteorological satellite"] },
  { zh: "遥感", en: ["remote sensing"] },
  { zh: "卫星", en: ["satellite"] },
  { zh: "雷达", en: ["radar"] },
  { zh: "光谱", en: ["spectral", "spectrum"] },

  // Covers orbital mechanics and space-environment vocabulary.
  { zh: "太空碎片", en: ["space debris", "space junk"] },
  { zh: "空间站", en: ["space station"] },
  { zh: "低地球轨道", en: ["low earth orbit", "leo"] },
  { zh: "地球同步轨道", en: ["geostationary orbit", "geo"] },
  { zh: "轨道力学", en: ["orbital mechanics"] },
  { zh: "轨道倾角", en: ["orbital inclination", "inclination"] },
  { zh: "碰撞避免", en: ["collision avoidance"] },
  { zh: "航天器", en: ["spacecraft"] },
  { zh: "探测器", en: ["probe", "detector"] },
  { zh: "火星车", en: ["rover", "mars rover"] },
  { zh: "着陆器", en: ["lander"] },
  { zh: "火星", en: ["mars"] },
  { zh: "月球", en: ["moon", "lunar"] },
  { zh: "轨道", en: ["orbit", "orbital"] },

  // Covers cities, infrastructure, and built-environment vocabulary.
  { zh: "城市热岛", en: ["urban heat island", "heat island"] },
  { zh: "城市扩张", en: ["urban expansion", "city growth"] },
  { zh: "夜间灯光", en: ["night light", "nighttime light"] },
  { zh: "不透水面", en: ["impervious surface"] },
  { zh: "城市化", en: ["urbanization"] },
  { zh: "基础设施", en: ["infrastructure"] },
  { zh: "交通", en: ["transport", "transportation"] },

  // Covers agriculture and crop-related vocabulary.
  { zh: "农业监测", en: ["agricultural monitoring", "crop monitoring"] },
  { zh: "作物产量", en: ["crop yield"] },
  { zh: "灌溉", en: ["irrigation"] },
  { zh: "农业", en: ["agriculture", "crop"] },
  { zh: "肥料", en: ["fertilizer"] },

  // Covers technical methods, analytics, and remote-sensing workflows.
  { zh: "深度学习", en: ["deep learning"] },
  { zh: "机器学习", en: ["machine learning"] },
  { zh: "神经网络", en: ["neural network"] },
  { zh: "地理信息系统", en: ["gis", "geographic information system"] },
  { zh: "图像分类", en: ["image classification", "classification"] },
  { zh: "变化检测", en: ["change detection"] },

  // Covers general scientific vocabulary that appears across multiple domains.
  { zh: "可视化", en: ["visualization"] },
  { zh: "监测", en: ["monitoring"] },
  { zh: "分析", en: ["analysis"] },
  { zh: "数据", en: ["data"] },
  { zh: "研究", en: ["research"] },
  { zh: "观测", en: ["observation"] },
  { zh: "测量", en: ["measurement"] },
  { zh: "模型", en: ["model"] },
  { zh: "预测", en: ["prediction", "forecast"] },
  { zh: "趋势", en: ["trend"] },
  { zh: "影响", en: ["impact", "effect"] },
  { zh: "技术", en: ["technology"] },
  { zh: "传感器", en: ["sensor"] },
  { zh: "频率", en: ["frequency"] },
  { zh: "分辨率", en: ["resolution"] },
  { zh: "海洋", en: ["ocean", "marine"] },
  { zh: "大气", en: ["atmosphere", "atmospheric"] },
  { zh: "温度", en: ["temperature"] },
  { zh: "能源", en: ["energy"] },
  { zh: "排放", en: ["emissions"] },
  { zh: "污染", en: ["pollution"] },
  { zh: "采矿", en: ["mining"] },
  { zh: "渔业", en: ["fishery"] },
  { zh: "沿海", en: ["coastal"] },
];

// Sorts entries by descending Chinese length so longest-match segmentation can operate greedily.
ZH_EN_DICT.sort((a, b) => b.zh.length - a.zh.length);

/**
 * Greedy longest-match Chinese segmentation.
 * Scans the input, tries the longest Chinese entries first,
 * emits the corresponding English tokens. Non-Chinese characters
 * are collected and split as English words.
 */
export function segmentChinese(text: string): string[] {
  const tokens: string[] = [];
  let i = 0;
  let englishBuffer = "";

  const flushEnglish = () => {
    if (englishBuffer.trim()) {
      for (const w of englishBuffer.trim().split(/\s+/)) {
        if (w) tokens.push(w.toLowerCase());
      }
    }
    englishBuffer = "";
  };

  while (i < text.length) {
    // Attempts to match the longest dictionary entry starting at the current character position.
    let matched = false;
    for (const entry of ZH_EN_DICT) {
      if (text.startsWith(entry.zh, i)) {
        flushEnglish();
        tokens.push(...entry.en.map((e) => e.toLowerCase()));
        i += entry.zh.length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      // Preserves unmatched characters so mixed-language queries are not silently dropped.
      englishBuffer += text[i];
      i++;
    }
  }
  flushEnglish();

  // Removes duplicates while preserving the original discovery order.
  const seen = new Set<string>();
  return tokens.filter((t) => {
    if (seen.has(t)) return false;
    seen.add(t);
    return true;
  });
}

export { ZH_EN_DICT };
