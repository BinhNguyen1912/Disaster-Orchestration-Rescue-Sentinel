import fs from 'fs/promises';
import path from 'path';
import https from 'https';

const PROVINCES = [
  { code: 1, name: 'Thành phố Hà Nội' },
  { code: 4, name: 'Tỉnh Cao Bằng' },
  { code: 8, name: 'Tỉnh Tuyên Quang' },
  { code: 11, name: 'Tỉnh Điện Biên' },
  { code: 12, name: 'Tỉnh Lai Châu' },
  { code: 14, name: 'Tỉnh Sơn La' },
  { code: 15, name: 'Tỉnh Lào Cai' },
  { code: 19, name: 'Tỉnh Thái Nguyên' },
  { code: 20, name: 'Tỉnh Lạng Sơn' },
  { code: 22, name: 'Tỉnh Quảng Ninh' },
  { code: 24, name: 'Tỉnh Bắc Ninh' },
  { code: 25, name: 'Tỉnh Phú Thọ' },
  { code: 31, name: 'Thành phố Hải Phòng' },
  { code: 33, name: 'Tỉnh Hưng Yên' },
  { code: 37, name: 'Tỉnh Ninh Bình' },
  { code: 38, name: 'Tỉnh Thanh Hóa' },
  { code: 40, name: 'Tỉnh Nghệ An' },
  { code: 42, name: 'Tỉnh Hà Tĩnh' },
  { code: 44, name: 'Tỉnh Quảng Trị' },
  { code: 46, name: 'Thành phố Huế' },
  { code: 48, name: 'Thành phố Đà Nẵng' },
  { code: 51, name: 'Tỉnh Quảng Ngãi' },
  { code: 52, name: 'Tỉnh Gia Lai' },
  { code: 56, name: 'Tỉnh Khánh Hòa' },
  { code: 66, name: 'Tỉnh Đắk Lắk' },
  { code: 68, name: 'Tỉnh Lâm Đồng' },
  { code: 75, name: 'Tỉnh Đồng Nai' },
  { code: 79, name: 'Thành phố Hồ Chí Minh' },
  { code: 80, name: 'Tỉnh Tây Ninh' },
  { code: 82, name: 'Tỉnh Đồng Tháp' },
  { code: 86, name: 'Tỉnh Vĩnh Long' },
  { code: 91, name: 'Tỉnh An Giang' },
  { code: 92, name: 'Thành phố Cần Thơ' },
  { code: 96, name: 'Tỉnh Cà Mau' },
];

interface ProvinceCenter {
  provinceCode: number;
  lat: number;
  lng: number;
}

function fetchNominatim(query: string): Promise<{ lat: string; lon: string }> {
  return new Promise((resolve, reject) => {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ', Vietnam')}&limit=1`;

    const options = {
      headers: {
        'User-Agent': 'RescueSystem/1.0',
      },
    };

    https.get(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const results = JSON.parse(data);
          if (results && results.length > 0) {
            resolve({ lat: results[0].lat, lon: results[0].lon });
          } else {
            reject(new Error(`No results for: ${query}`));
          }
        } catch (e) {
          reject(e);
        }
      });
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const dataDir = path.join(__dirname, '..', 'data');
  const centers: ProvinceCenter[] = [];

  console.log(`Fetching coordinates for ${PROVINCES.length} provinces...`);

  for (let i = 0; i < PROVINCES.length; i++) {
    const province = PROVINCES[i];

    try {
      // Remove "Tỉnh", "Thành phố" prefix for cleaner search
      const searchName = province.name.replace(/^(Tỉnh|Thành phố)\s+/, '');
      const result = await fetchNominatim(searchName);

      centers.push({
        provinceCode: province.code,
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
      });

      console.log(`[${i + 1}/${PROVINCES.length}] ${province.name}: ${result.lat}, ${result.lon}`);
    } catch (e) {
      console.error(`[${i + 1}/${PROVINCES.length}] Failed: ${province.name} - ${e.message}`);
      // Use fallback coordinates for Hanoi
      if (province.code === 1) {
        centers.push({ provinceCode: 1, lat: 21.0285, lng: 105.8542 });
      }
    }

    // Rate limiting - OSM Nominatim requires 1 request per second
    if (i < PROVINCES.length - 1) {
      await sleep(1100);
    }
  }

  await fs.writeFile(
    path.join(dataDir, 'province-centers.json'),
    JSON.stringify(centers, null, 2),
    'utf-8',
  );

  console.log(`\nSaved ${centers.length} province centers to province-centers.json`);
}

main().catch(console.error);