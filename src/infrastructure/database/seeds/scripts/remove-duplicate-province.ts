import fs from 'fs/promises';
import path from 'path';

type Province = {
  code: number;
  name: string;
  shortName: string;
  isActive?: boolean;
};

async function removeDuplicateProvince() {
  const dataDir = path.join(__dirname, '..', 'data');
  const filePath = path.join(dataDir, 'provinces.json');
  const raw = await fs.readFile(filePath, 'utf-8');
  const provinces: Province[] = JSON.parse(raw);

  const seenNames = new Set<string>();
  const uniqueProvinces: Province[] = [];
  const duplicates: Province[] = [];

  for (const province of provinces) {
    if (seenNames.has(province.name)) {
      duplicates.push(province);
      continue;
    }

    seenNames.add(province.name);
    uniqueProvinces.push(province);
  }

  const outputPath = path.join(dataDir, 'provinces-clean.json');
  await fs.writeFile(outputPath, JSON.stringify(uniqueProvinces, null, 2), 'utf-8');

  console.log(`Tổng record gốc: ${provinces.length}`);
  console.log(`Sau khi lọc: ${uniqueProvinces.length}`);
  console.log(`Duplicate: ${duplicates.length}`);

  if (duplicates.length) {
    console.log('\n=== Duplicate records ===');
    duplicates.forEach((item) => {
      console.log(`code=${item.code} | name=${item.name}`);
    });
  }
}

removeDuplicateProvince().catch(console.error);