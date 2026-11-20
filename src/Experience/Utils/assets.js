const root = import.meta.env.BASE_URL;

export function roomAtlases(useKtx, night = false) {
  const mode = night ? "night" : "day";
  const names = ["first-house", "frames", "third-desk", "fourth-extras", "fifth-background",
    "sixth-plants", "seventh-large-stuff", "eighth-decor"];
  return names.map(name => {
    const frames = name === "frames";
    const ordinal = frames ? "second" : name.split("-")[0];
    const compressed = useKtx && !frames;
    const filename = frames ? "frames-" + mode : name + "_" + mode;
    const path = root + "textures/" + mode + "/" + filename;
    return {
      name: ordinal + (night ? "NightTexture" : "Texture"),
      path: path + (compressed ? ".ktx2" : ".webp"),
      fallback: compressed ? path + ".webp" : null,
      type: compressed ? "ktx2" : "texture",
    };
  });
}

export const studioAssets = [
  { name: "studioPrints", type: "texture", path: root + "textures/studio-prints.webp" },
  { name: "portfolioLettering", type: "texture", path: root + "textures/portfolio-lettering.png" },
  { name: "room", type: "glbModel", path: root + "models/Room.glb" },
  { name: "hitboxes", type: "glbModel", path: root + "models/Hitboxes.glb" },
  { name: "goboTexture", type: "texture", path: root + "textures/gobo.jpg" },
  { name: "butterflyWingTexture", type: "texture", path: root + "textures/butterfly_wing.webp" },
];
