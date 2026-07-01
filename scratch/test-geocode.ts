import * as https from 'https';

const query = '65/15 đường 339, Thành phố Hồ Chí Minh';
const cleanedQuery = query
  .replace(/^(Xã|Phường|Thị trấn|Quận|Huyện|Thành phố|Tỉnh)\s+/gi, '')
  .replace(/,\s*(Xã|Phường|Thị trấn|Quận|Huyện|Thành phố|Tỉnh)\s+/gi, ', ');

const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
  cleanedQuery + ', Vietnam'
)}&limit=6&addressdetails=1`;

const options = {
  headers: {
    'User-Agent': 'RescueSystem/1.0',
    'Accept-Language': 'vi',
  },
};

console.log('Fetching:', url);
https
  .get(url, options, (res) => {
    let data = '';
    res.on('data', (chunk) => (data += chunk));
    res.on('end', () => {
      console.log('Status code:', res.statusCode);
      try {
        const results = JSON.parse(data);
        console.log('Results count:', results.length);
        if (results.length > 0) {
          results.forEach((r: any, idx: number) => {
            console.log(`[${idx}]`, r.display_name, 'Coords:', r.lat, r.lon);
          });
        } else {
          console.log('No results found.');
        }
      } catch (e: any) {
        console.error('Error parsing JSON:', e.message);
        console.log('Raw data response:', data);
      }
    });
  })
  .on('error', (err) => {
    console.error('Request error:', err.message);
  });
