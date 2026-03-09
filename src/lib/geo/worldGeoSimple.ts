/**
 * Simplified world countries GeoJSON for D3 map projections.
 * Minimalist paths — just enough to be recognizable continents.
 * Used by ClimateMap and StationMap.
 */

// Simplified world land boundaries as a single FeatureCollection
// Each feature has a "name" property for tooltip / identification
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const worldGeoSimple: any = {
  type: "FeatureCollection",
  features: [
    // Approximates the North American mainland outline for simplified global basemaps.
    {
      type: "Feature",
      properties: { name: "North America" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-130, 50],
            [-125, 60],
            [-100, 65],
            [-85, 70],
            [-60, 65],
            [-55, 50],
            [-65, 45],
            [-70, 40],
            [-80, 25],
            [-90, 18],
            [-100, 20],
            [-105, 22],
            [-115, 30],
            [-125, 40],
            [-130, 50],
          ],
        ],
      },
    },
    // Adds the Central American land bridge so the simplified basemap stays visually connected.
    {
      type: "Feature",
      properties: { name: "Central America" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-90, 18],
            [-85, 15],
            [-82, 10],
            [-78, 8],
            [-80, 10],
            [-85, 12],
            [-88, 15],
            [-90, 18],
          ],
        ],
      },
    },
    // Approximates the South American continent for simplified global basemaps.
    {
      type: "Feature",
      properties: { name: "South America" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-78, 8],
            [-72, 12],
            [-60, 10],
            [-50, 5],
            [-35, -5],
            [-35, -15],
            [-38, -20],
            [-45, -25],
            [-50, -30],
            [-55, -35],
            [-60, -40],
            [-65, -45],
            [-70, -50],
            [-75, -55],
            [-70, -45],
            [-70, -35],
            [-72, -20],
            [-75, -10],
            [-78, 0],
            [-78, 8],
          ],
        ],
      },
    },
    // Approximates Europe and its northern extension for simplified global basemaps.
    {
      type: "Feature",
      properties: { name: "Europe" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-10, 36],
            [0, 38],
            [5, 44],
            [3, 48],
            [-5, 48],
            [-8, 55],
            [5, 55],
            [10, 55],
            [20, 55],
            [30, 58],
            [35, 65],
            [30, 70],
            [20, 70],
            [10, 65],
            [5, 60],
            [0, 55],
            [-5, 55],
            [-8, 55],
            [-10, 50],
            [-10, 36],
          ],
        ],
      },
    },
    // Approximates the African continent for simplified global basemaps.
    {
      type: "Feature",
      properties: { name: "Africa" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-15, 30],
            [-17, 15],
            [-15, 10],
            [-8, 5],
            [5, 5],
            [10, 0],
            [12, -5],
            [15, -10],
            [20, -15],
            [30, -20],
            [35, -25],
            [38, -30],
            [35, -35],
            [28, -34],
            [22, -30],
            [18, -25],
            [15, -15],
            [20, -10],
            [32, -5],
            [40, 0],
            [42, 5],
            [50, 10],
            [43, 12],
            [38, 15],
            [35, 20],
            [33, 30],
            [30, 35],
            [10, 37],
            [0, 35],
            [-5, 35],
            [-15, 30],
          ],
        ],
      },
    },
    // Approximates the main Asian landmass using a single simplified polygon.
    {
      type: "Feature",
      properties: { name: "Asia" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [30, 35],
            [40, 40],
            [50, 38],
            [55, 25],
            [60, 25],
            [65, 30],
            [70, 28],
            [75, 15],
            [80, 8],
            [80, 15],
            [85, 20],
            [90, 22],
            [95, 18],
            [100, 15],
            [105, 10],
            [110, 18],
            [115, 22],
            [120, 25],
            [125, 35],
            [130, 40],
            [135, 45],
            [140, 45],
            [145, 50],
            [140, 55],
            [135, 60],
            [130, 65],
            [120, 70],
            [90, 72],
            [70, 70],
            [60, 65],
            [50, 55],
            [40, 50],
            [35, 45],
            [30, 40],
            [30, 35],
          ],
        ],
      },
    },
    // Approximates Australia for simplified global basemaps.
    {
      type: "Feature",
      properties: { name: "Australia" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [115, -15],
            [120, -14],
            [130, -12],
            [140, -14],
            [145, -16],
            [150, -22],
            [152, -28],
            [150, -32],
            [148, -38],
            [142, -38],
            [135, -35],
            [130, -32],
            [125, -30],
            [118, -28],
            [115, -25],
            [113, -22],
            [115, -15],
          ],
        ],
      },
    },
    // Adds Greenland so northern map projections retain a recognizable polar landmass.
    {
      type: "Feature",
      properties: { name: "Greenland" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-50, 60],
            [-44, 60],
            [-35, 65],
            [-20, 70],
            [-18, 75],
            [-20, 80],
            [-35, 82],
            [-50, 80],
            [-55, 75],
            [-55, 70],
            [-50, 60],
          ],
        ],
      },
    },
    // Adds a simplified island cluster for Indonesia and nearby Southeast Asian islands.
    {
      type: "Feature",
      properties: { name: "Indonesia" },
      geometry: {
        type: "MultiPolygon",
        coordinates: [
          [
            [
              [95, 5],
              [105, 5],
              [108, -5],
              [115, -8],
              [105, -8],
              [95, -5],
              [95, 5],
            ],
          ],
          [
            [
              [115, -2],
              [120, -2],
              [125, -5],
              [130, -8],
              [125, -8],
              [120, -5],
              [115, -2],
            ],
          ],
        ],
      },
    },
    // Adds a simplified Japanese archipelago outline.
    {
      type: "Feature",
      properties: { name: "Japan" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [130, 31],
            [132, 33],
            [135, 35],
            [140, 40],
            [142, 43],
            [145, 45],
            [144, 43],
            [141, 40],
            [138, 35],
            [135, 33],
            [132, 31],
            [130, 31],
          ],
        ],
      },
    },
    // Adds a simplified New Zealand outline as a separate island feature.
    {
      type: "Feature",
      properties: { name: "New Zealand" },
      geometry: {
        type: "MultiPolygon",
        coordinates: [
          [
            [
              [172, -35],
              [175, -37],
              [178, -40],
              [176, -42],
              [173, -40],
              [172, -35],
            ],
          ],
          [
            [
              [166, -44],
              [168, -44],
              [172, -46],
              [168, -47],
              [166, -46],
              [166, -44],
            ],
          ],
        ],
      },
    },
    // Adds simplified outlines for the UK and Ireland as separate islands off Europe.
    {
      type: "Feature",
      properties: { name: "UK" },
      geometry: {
        type: "MultiPolygon",
        coordinates: [
          [
            [
              [-6, 50],
              [-5, 52],
              [-3, 54],
              [-2, 56],
              [-4, 58],
              [-6, 58],
              [-5, 56],
              [-6, 54],
              [-8, 52],
              [-6, 50],
            ],
          ],
          [
            [
              [-10, 51],
              [-9, 52],
              [-7, 54],
              [-8, 55],
              [-10, 54],
              [-10, 51],
            ],
          ],
        ],
      },
    },
    // Extends the northern Eurasian coastline so high-latitude projections do not look truncated.
    {
      type: "Feature",
      properties: { name: "Arctic" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [30, 70],
            [50, 70],
            [70, 72],
            [100, 72],
            [120, 72],
            [150, 68],
            [170, 66],
            [180, 65],
            [180, 70],
            [170, 72],
            [150, 73],
            [120, 75],
            [90, 75],
            [60, 73],
            [40, 72],
            [30, 70],
          ],
        ],
      },
    },
    // Adds a simplified Middle East polygon to better connect Europe, Africa, and Asia.
    {
      type: "Feature",
      properties: { name: "Middle East" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [30, 35],
            [35, 32],
            [36, 30],
            [40, 28],
            [45, 25],
            [50, 22],
            [55, 22],
            [56, 25],
            [55, 27],
            [50, 30],
            [48, 32],
            [45, 35],
            [40, 38],
            [35, 40],
            [30, 38],
            [30, 35],
          ],
        ],
      },
    },
    // Adds a simplified Indian subcontinent outline including the Sri Lanka extension.
    {
      type: "Feature",
      properties: { name: "India" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [68, 24],
            [72, 20],
            [74, 15],
            [77, 10],
            [80, 8],
            [80, 12],
            [83, 16],
            [88, 22],
            [92, 26],
            [88, 28],
            [82, 28],
            [78, 30],
            [72, 32],
            [68, 28],
            [68, 24],
          ],
        ],
      },
    },
  ],
};
