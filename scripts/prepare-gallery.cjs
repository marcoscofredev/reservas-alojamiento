const fs = require("node:fs/promises");
const path = require("node:path");
const sharp = require("sharp");

const project = path.join(__dirname, "..");
const photos = {
    "frente-1": "frente-1-retoque-natural-v2.png",
    matrimonial: "matrimonial-retoque-natural.png",
    cocina: "cocina-retoque-natural-v2.png",
    "sala-de-estar": "sala-de-estar-retoque-natural.png",
    habitacion: "habitacion-retoque-natural.png",
    comedor: "comedor-retoque-natural.png",
    "frente-2": "frente-2-retoque-natural.png",
    "frente-entrada": "frente-entrada-retoque-natural.png",
    "cocina-2": "cocina-2-retoque-natural.png",
    bano: "bano-retoque-natural.png",
    ducha: "ducha-retoque-natural.png",
    lavamanos: "lavamanos-retoque-natural.png",
    "pueblo-1": "pueblo-1-retoque-natural.png",
    "pueblo-2": "pueblo-2-retoque-natural.png"
};

async function prepare() {
    const directory = path.join(project, "imagenes/galeria");
    await fs.mkdir(directory, { recursive: true });
    const manifest = [];
    for (const [key, source] of Object.entries(photos)) {
        const input = path.join(project, "imagenes", source);
        const metadata = await sharp(input).metadata();
        // Solo codifica y reduce para la web; los retoques ya se hicieron con image_gen.
        await sharp(input).jpeg({ quality: 90, mozjpeg: true }).toFile(path.join(directory, `${key}.jpg`));
        const thumbnail = await sharp(input).resize({ width: 640, withoutEnlargement: true })
            .jpeg({ quality: 85, mozjpeg: true }).toFile(path.join(directory, `${key}-thumb.jpg`));
        manifest.push({ key, source, width: metadata.width, height: metadata.height, thumbnailWidth: thumbnail.width, thumbnailHeight: thumbnail.height });
    }
    await fs.writeFile(path.join(project, "output/imagegen/gallery-manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
    console.log(`Preparadas ${manifest.length} fotos y sus miniaturas. Se conservaron los PNG y las fotos originales.`);
}

prepare().catch(error => { console.error(error.message); process.exitCode = 1; });
