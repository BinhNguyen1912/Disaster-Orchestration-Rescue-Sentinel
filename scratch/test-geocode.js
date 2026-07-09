"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const https = __importStar(require("https"));
const query = '65/15 đường 339, Thành phố Hồ Chí Minh';
const cleanedQuery = query
    .replace(/^(Xã|Phường|Thị trấn|Quận|Huyện|Thành phố|Tỉnh)\s+/gi, '')
    .replace(/,\s*(Xã|Phường|Thị trấn|Quận|Huyện|Thành phố|Tỉnh)\s+/gi, ', ');
const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanedQuery + ', Vietnam')}&limit=6&addressdetails=1`;
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
                results.forEach((r, idx) => {
                    console.log(`[${idx}]`, r.display_name, 'Coords:', r.lat, r.lon);
                });
            }
            else {
                console.log('No results found.');
            }
        }
        catch (e) {
            console.error('Error parsing JSON:', e.message);
            console.log('Raw data response:', data);
        }
    });
})
    .on('error', (err) => {
    console.error('Request error:', err.message);
});
//# sourceMappingURL=test-geocode.js.map