import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, SafeAreaView, StatusBar, Modal, ScrollView, Linking, RefreshControl, Platform } from 'react-native';
import MapView, { Marker, UrlTile } from 'react-native-maps';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';

// Winter Garden, FL coordinates for distance sorting
const USER_LOCATION = { lat: 28.5623, lon: -81.5947 };

// Haversine formula to calculate distance in miles
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 9999;
  const toRad = (value) => (value * Math.PI) / 180;
  const R = 3958.8;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Open external maps helper function
const openMapsApp = (address, lat, lon) => {
  const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
  const latLng = lat && lon ? `${lat},${lon}` : address;
  const url = Platform.select({
    ios: `${scheme}${address}@${latLng}`,
    android: `${scheme}${latLng}(${address})`
  });
  const webUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  
  Linking.canOpenURL(url).then(supported => {
    if (supported) { Linking.openURL(url); } else { Linking.openURL(webUrl); }
  }).catch(() => Linking.openURL(webUrl));
};

// --- EMBEDDED MASTER DATABASE (Zero external dependencies, 100% reliable) ---
const MASTER_TRACKS = [
  {
    id: "croom-wma",
    name: "Croom Motorcycle Area (Withlacoochee State Forest)",
    type: "OHV Trail System",
    city: "Brooksville, FL",
    address: "6420 La Rose Rd, Brooksville, FL 34602",
    lat: 28.5878,
    lon: -82.2269,
    hours: "Daily Sunrise to Sunset",
    terrain: "2,600 acres of sugar sand, shaded oak/pine single-track, whoops, and deep mining pits",
    requirements: "Annual ($55.35) or Daily ($12.15) Florida Forest Service OHV Permit + Spark Arrestor",
    social: "https://www.fdacs.gov/Forest-Wildfire/Our-Forests/State-Forests/Withlacoochee-State-Forest/Croom-Motorcycle-Area",
    notes: "Central Florida's premier dirt bike trail park right off I-75 & SR-50. Has a fenced youth/beginner training loop and full campground."
  },
  {
    id: "ocala-big-scrub",
    name: "Ocala National Forest - Big Scrub Trailhead",
    type: "OHV Trail System",
    city: "Altoona / Umatilla, FL",
    address: "26315 SE Hwy 42, Altoona, FL 32702",
    lat: 29.0064,
    lon: -81.5956,
    hours: "Daily Sunrise to Sunset",
    terrain: "Direct access to the 47-mile Centennial Loop and Wandering Wiregrass single-track",
    requirements: "USFS Ocala OHV Permit required + Spark Arrestor",
    social: "https://www.recreation.gov/permits/251852",
    notes: "Main staging ground and campground for motorcycle and ATV riders on the southern side of Ocala National Forest."
  },
  {
    id: "ocala-delancy-west",
    name: "Ocala National Forest - Delancy West Trailhead",
    type: "OHV Trail System",
    city: "Fort McCoy, FL",
    address: "10863 E Hwy 316, Fort McCoy, FL 32134",
    lat: 29.3621,
    lon: -81.8014,
    hours: "Daily Sunrise to Sunset",
    terrain: "14-mile Motorcycle-Only loop, sandy pine scrub, and fast flowing two-track",
    requirements: "USFS Trail Pass + Spark Arrestor",
    social: "https://www.fs.usda.gov/recarea/florida/recarea/?recid=83582",
    notes: "Dedicated motorcycle-only loop parking area on the north side of the forest. Strictly forbids wide vehicles."
  },
  {
    id: "ocala-pipeline-trailhead",
    name: "Ocala National Forest - Pipeline Trailhead",
    type: "OHV Trail System",
    city: "Silver Springs, FL",
    address: "State Road 19 & Pipeline Rd, Silver Springs, FL 32488",
    lat: 29.2841,
    lon: -81.7512,
    hours: "Daily Sunrise to Sunset",
    terrain: "Wide sandy corridors, fast high-speed stretches, and connector tracks",
    requirements: "USFS Trail Pass + Spark Arrestor",
    social: "https://www.fs.usda.gov/apalachicola",
    notes: "Central staging area connecting to the broader northern forest trail network."
  },
  {
    id: "74mx-rck",
    name: "74MX at The RCK",
    type: "MX & Off-Road Park",
    city: "Punta Gorda, FL",
    address: "44800 Bermont Rd, Punta Gorda, FL 33982",
    lat: 26.9242,
    lon: -81.7214,
    hours: "Wed & Thu 11:00 AM – 6:00 PM; Sat & Sun 9:00 AM – 4:00 PM",
    terrain: "Deep South Florida sand main track, vet/novice track, peewee track, and perimeter trails",
    requirements: "$35 rider fee; online waiver via MX-Tickets",
    social: "https://74famfunpark.wixsite.com/74mxoffroad",
    notes: "Huge Southwest Florida sand complex on SR-74 (Bermont Rd)."
  },
  {
    id: "gatorback-cycle-park",
    name: "Gatorback Cycle Park (Diamondback MX)",
    type: "MX & Off-Road Park",
    city: "High Springs / Alachua, FL",
    address: "20525 NW 46th Ave, Alachua, FL 32615",
    lat: 29.7495,
    lon: -82.5839,
    hours: "Major Race & Practice Weekends",
    terrain: "Famous natural elevation changes, hardpack clay hills, deep sand sections, Supercross track",
    requirements: "Event admission / AMA membership required on race weekends",
    social: "https://unlimitedsportsmx.com/",
    notes: "Legendary North Central Florida facility. Home of the Thanksgiving Thor Mini O's."
  },
  {
    id: "ww-ranch-mx",
    name: "WW Ranch Motocross Park",
    type: "MX Track",
    city: "Jacksonville, FL",
    address: "1439 Otis Rd, Jacksonville, FL 32220",
    lat: 30.3204,
    lon: -81.8972,
    hours: "Wed, Sat & Sun 9:00 AM – 3:00 PM",
    terrain: "600-acre farm featuring a pro-level sandy loam national track, vet track, and peewee track",
    requirements: "$35 practice fee; digital waiver required",
    social: "https://wwmotox.com/",
    notes: "Former host of the MXGP of USA and AMA Pro Motocross National."
  },
  {
    id: "dan-woodley-racing",
    name: "Dan Woodley Racing Motocross AirBNB",
    type: "Private MX Vacation Compound",
    city: "Okeechobee, FL",
    address: "2700 S Header Canal Rd, Okeechobee, FL 34974",
    lat: 27.2081,
    lon: -80.7932,
    hours: "By Reservation / AirBNB Stay Only",
    terrain: "Private prepped MX track, cornering tracks, and sandy loam training loops",
    requirements: "Must book cabin/RV rental or private training session in advance",
    social: "https://www.danwoodleyracing.com/",
    notes: "Ride-in/ride-out motocross vacation rental in Okeechobee."
  },
  {
    id: "motobros-punta-gorda",
    name: "MotoBros Punta Gorda MX",
    type: "MX Track",
    city: "Punta Gorda, FL",
    address: "8655 Piper Rd, Punta Gorda, FL 33982",
    lat: 26.9128,
    lon: -81.9864,
    hours: "Wed Night Practice; Sat & Sun 9:00 AM – 3:00 PM",
    terrain: "Dark dirt/sand mix main MX track, stadium night track, and beginner/peewee track",
    requirements: "$35 practice fee",
    social: "https://www.motobros.net/",
    notes: "Located right next to Punta Gorda Airport off I-75."
  },
  {
    id: "motobros-okeechobee",
    name: "MotoBros Okeechobee MX",
    type: "MX & Off-Road Park",
    city: "Okeechobee, FL",
    address: "9600 NE 120th St, Okeechobee, FL 34972",
    lat: 27.3911,
    lon: -80.6845,
    hours: "Sat & Sun 9:00 AM – 3:00 PM",
    terrain: "Fast sand/loam outdoor MX layout, mini track, and woods loop",
    requirements: "$35 practice fee",
    social: "https://www.motobros.net/",
    notes: "Hosts Round 10 of the Florida Motocross Series."
  },
  {
    id: "lake-city-mx",
    name: "Lake City Motocross",
    type: "MX Track",
    city: "Lake City, FL",
    address: "3320 N US Hwy 441, Lake City, FL 32055",
    lat: 30.2465,
    lon: -82.6391,
    hours: "Select Weekends 9:00 AM – 3:00 PM",
    terrain: "North Florida sandy clay MX track with natural rollers and tabletops",
    requirements: "$30–$35 practice fee",
    social: "https://www.riderplanet-usa.com/",
    notes: "Just 2.5 miles north of I-10 Exit 303 on US-441."
  },
  {
    id: "mx-91-jax",
    name: "MX 91 (Jacksonville)",
    type: "MX Track",
    city: "Jacksonville, FL",
    address: "West Jacksonville, FL 32220",
    lat: 30.3051,
    lon: -81.9125,
    hours: "Check local social feeds for open practice sessions",
    terrain: "Sandy loam practice track and turn tracks",
    requirements: "Day rider fee",
    social: "https://www.facebook.com/",
    notes: "Local Jacksonville training and practice spot."
  },
  {
    id: "milton-mx",
    name: "Milton MX & MX 191",
    type: "MX Track",
    city: "Milton, FL",
    address: "6039 Fairlands Rd, Milton, FL 32583",
    lat: 30.6542,
    lon: -86.9921,
    hours: "Wed 12:00 PM – Dusk; Sat & Sun 10:00 AM – 6:00 PM",
    terrain: "Panhandle red clay and sand mix with natural elevation",
    requirements: "$30 practice fee",
    social: "https://www.mxcircuit.es/en/tracks/milton-mx",
    notes: "Hardpack Panhandle clay and sand tracks right near Blackwater River State Forest."
  },
  {
    id: "pax-trax-mx",
    name: "Pax Trax Motocross Park",
    type: "MX Track",
    city: "Bunnell, FL",
    address: "4850 State Hwy 11, Bunnell, FL 32110",
    lat: 29.4018,
    lon: -81.2981,
    hours: "Wed 10:00 AM – 3:00 PM; Sat & Sun 9:00 AM – 3:00 PM",
    terrain: "Fast East Coast sand/clay blend with sweeping rhythm sections",
    requirements: "$35 rider fee",
    social: "https://www.paxtraxmx.com/",
    notes: "25 minutes north of Daytona. Heavy weekend track prep."
  },
  {
    id: "daytona-mx",
    name: "Daytona International Speedway",
    type: "Major Race Venue",
    city: "Daytona Beach, FL",
    address: "1801 W International Speedway Blvd, Daytona Beach, FL 32114",
    lat: 29.1852,
    lon: -81.0705,
    hours: "Open During Daytona Bike Week / RCSX (March)",
    terrain: "Custom-built deep beach sand and black loam Supercross/MX hybrid course",
    requirements: "AMA Credential / RCSX Race Registration",
    social: "https://www.daytonainternationalspeedway.com/",
    notes: "Hosts Daytona Supercross and Ricky Carmichael Amateur Supercross."
  },
  {
    id: "north-florida-mx",
    name: "North Florida Motocross Park",
    type: "MX Track",
    city: "Hilliard, FL",
    address: "554041 US-1, Hilliard, FL 32046",
    lat: 30.6624,
    lon: -81.9012,
    hours: "Thu 9:00 AM – 2:00 PM; Sat & Sun 8:00 AM – 6:00 PM",
    terrain: "40-acre park with 3 tracks: main track, rhythmic clay track, and mini track",
    requirements: "$30 rider fee",
    social: "https://www.northfloridamotocrosspark.com/",
    notes: "Features 50-amp RV hookups, oak shade, and clean restrooms."
  },
  {
    id: "brooksville-mx",
    name: "Brooksville MX (Citrus Way Track)",
    type: "MX Track",
    city: "Brooksville, FL",
    address: "16219 Citrus Way, Brooksville, FL 34614",
    lat: 28.6592,
    lon: -82.4381,
    hours: "Tue–Fri 9:00 AM – 5:30 PM; Sat 11:00 AM – 5:00 PM",
    terrain: "Sandy loam MX track with beginner/youth friendly jumps",
    requirements: "Call/check Facebook before hauling",
    social: "https://www.riderplanet-usa.com/",
    notes: "Located off US-98 North in Brooksville, 20 minutes west of Croom."
  },
  {
    id: "bostwick-creek-mx",
    name: "Bostwick Creek MX Park",
    type: "MX & Trail Park",
    city: "Green Cove Springs, FL",
    address: "1350 Sungarden Rd, Green Cove Springs, FL 32043",
    lat: 30.0419,
    lon: -81.7342,
    hours: "Sat & Sun 9:00 AM – 3:00 PM",
    terrain: "Sandy loam outdoor MX track, peewee track, and woods trails",
    requirements: "$35 rider fee",
    social: "https://www.facebook.com/BostwickCreekMX/",
    notes: "Fun, rider-friendly jumps safe for C and B riders."
  },
  {
    id: "orlando-mx",
    name: "Orlando MX Park (Bithlo)",
    type: "MX Track",
    city: "Orlando, FL",
    address: "19400 E Colonial Dr, Orlando, FL 32820",
    lat: 28.5542,
    lon: -81.0847,
    hours: "Wed, Sat & Sun 9:00 AM – 3:00 PM (Thu Night Practice)",
    terrain: "Loamy dark dirt/sand main track, separate vet track, and peewee track",
    requirements: "$35 practice fee",
    social: "https://www.orlandomxo.com/",
    notes: "Central Florida staple since 1969 right on Hwy 50 in Bithlo."
  },
  {
    id: "bone-valley-atv",
    name: "Bone Valley ATV Park & Bone Yard MX",
    type: "OHV & MX Park",
    city: "Mulberry, FL",
    address: "10427 County Road 630 W, Mulberry, FL 33860",
    lat: 27.8184,
    lon: -81.9812,
    hours: "Fri–Mon 8:00 AM – 5:00 PM",
    terrain: "200 acres of phosphate hills, clay/sand trails, and Bone Yard MX track",
    requirements: "$15 rider fee + Polk County waiver",
    social: "https://www.polk-county.net/",
    notes: "Great value at $15/day with 14 trails and wash bays."
  },
  {
    id: "rancho-bonito",
    name: "Rancho Bonito Off-Road & Trails",
    type: "OHV & Mud/Trail Area",
    city: "Kathleen / Zephyrhills, FL",
    address: "44356 County Road 54 E, Kathleen, FL 33849",
    lat: 28.2141,
    lon: -82.1037,
    hours: "Sat & Sun 9:00 AM – 7:00 PM via Permitted Guides",
    terrain: "Thousands of acres of open trails, sand pits, and mud holes",
    requirements: "Landowner gate key OR guided day pass",
    social: "https://www.revduprentals.com/",
    notes: "Massive unincorporated off-road tract on the Polk/Pasco border."
  },
  {
    id: "dade-city-mx",
    name: "Dade City Motocross (DCMX Raceway)",
    type: "MX Track",
    city: "Dade City, FL",
    address: "36722 State Rd 52, Dade City, FL 33525",
    lat: 28.3497,
    lon: -82.2261,
    hours: "Tue & Thu Practice 4:00 PM – 9:00 PM; Sat Night Racing",
    terrain: "Rich clay and dark loam stadium-style MX track + peewee track",
    requirements: "$30–$35 practice fee",
    social: "https://dadecitymx.com/",
    notes: "Famous for Saturday Night points racing under the lights."
  },
  {
    id: "mesa-mx",
    name: "Mesa Motocross Park",
    type: "MX Track",
    city: "Fellsmere, FL",
    address: "9550 Mesa Park E, Fellsmere, FL 32948",
    lat: 27.7689,
    lon: -80.6014,
    hours: "Sat & Sun 9:00 AM – 3:00 PM",
    terrain: "1.3-mile sandy soil MX track with technical ruts and tabletops",
    requirements: "$35 practice fee",
    social: "https://www.facebook.com/MesaMotocross/",
    notes: "East Coast Florida staple right off I-95 Exit 156."
  },
  {
    id: "spyder-mx-2",
    name: "Spyder MX 2.0 (Action Sports Complex)",
    type: "MX Track",
    city: "Bushnell, FL",
    address: "5821 Pit Rd, Bushnell, FL 33513",
    lat: 28.6641,
    lon: -82.2015,
    hours: "⚠️ Check Status Before Hauling",
    terrain: "Motorcycles-only sand and clay MX track",
    requirements: "Dirt bikes only",
    social: "https://www.riderplanet-usa.com/",
    notes: "Located west of Bushnell on Pit Rd."
  },
  {
    id: "lazy-springs-mx",
    name: "Lazy Springs Recreation Park & MX",
    type: "OHV & MX Park",
    city: "Felda, FL",
    address: "9591 State Road 82, Felda, FL 33930",
    lat: 26.5412,
    lon: -81.4685,
    hours: "Fri 5:00 PM – 7:45 PM; Sat & Sun 7:00 AM – 7:45 PM",
    terrain: "750 acres featuring MX tracks, single-track trails, and rock crawls",
    requirements: "Day admission fee",
    social: "https://lazysprings.com/",
    notes: "Huge Southwest Florida off-road recreation park east of Fort Myers."
  },
  {
    id: "miami-mx-park",
    name: "Miami Motocross Park",
    type: "MX Track",
    city: "Hialeah / Miami, FL",
    address: "16665 Krome Ave, Hialeah, FL 33018",
    lat: 25.9248,
    lon: -80.4491,
    hours: "Wed & Thu 2:00 PM – 9:00 PM; Sat & Sun 9:00 AM – 4:00 PM",
    terrain: "Crushed coral/limestone mixed with dark soil and sand; fully lit",
    requirements: "$35 rider fee",
    social: "https://miamimotocrosspark.com/",
    notes: "South Florida's premier track right on Krome Ave."
  },
  {
    id: "waldo-mx",
    name: "Waldo MX & Event Grounds",
    type: "MX & Woods Park",
    city: "Waldo, FL",
    address: "17000 NE US Hwy 301, Waldo, FL 32694",
    lat: 29.8112,
    lon: -82.1598,
    hours: "Sat & Sun 9:00 AM – 4:00 PM",
    terrain: "130 acres featuring a 1.5-mile outdoor MX track and woods trails",
    requirements: "$35 practice fee",
    social: "https://www.waldomx.com/",
    notes: "North Central Florida facility near Gainesville."
  },
  {
    id: "bartow-mx",
    name: "Bartow Motocross Park",
    type: "MX Track",
    city: "Bartow, FL",
    address: "9825 US-17, Bartow, FL 33830",
    lat: 27.8542,
    lon: -81.8159,
    hours: "Wed Night Practice; Sat & Sun 9:00 AM – 3:00 PM",
    terrain: "Dark loamy soil mixed with sand",
    requirements: "$35 practice fee",
    social: "https://www.facebook.com/BartowMotocross/",
    notes: "Central Polk County MX track with night lighting."
  },
  {
    id: "sunshine-state-mx",
    name: "Sunshine State MX Park",
    type: "MX Track",
    city: "Jasper, FL",
    address: "5577 State Road 6 W, Jasper, FL 32052",
    lat: 30.5144,
    lon: -83.0361,
    hours: "Sat & Sun 9:00 AM – 4:00 PM",
    terrain: "Deep North Florida sand and red clay mix",
    requirements: "$35 practice fee",
    social: "https://www.facebook.com/SunshineStateMX/",
    notes: "Right off I-75 near the Georgia line."
  },
  {
    id: "decker-training-facility",
    name: "Decker Training Facility (DTF)",
    type: "MX Training Facility",
    city: "Fountain, FL",
    address: "2516 County Line Rd, Fountain, FL 32438",
    lat: 30.4812,
    lon: -85.4218,
    hours: "Open Practice & Training Camps",
    terrain: "Pro-level Panhandle red clay and sand national track",
    requirements: "Day rider fee",
    social: "https://deckertrainingfacility.com/",
    notes: "Premier Panhandle training complex north of Panama City."
  },
  {
    id: "clear-creek-ohv",
    name: "Clear Creek OHV Trails (Blackwater River State Forest)",
    type: "OHV Trail System",
    city: "Milton, FL",
    address: "6500 Hwy 87 N, Milton, FL 32570",
    lat: 30.7289,
    lon: -87.0195,
    hours: "Fri–Mon Sunrise to Sunset",
    terrain: "53 miles of hardpack red clay, sand, and single-track",
    requirements: "$15 Daily Pass or Annual Permit",
    social: "https://www.fdacs.gov/",
    notes: "Genuine hardpack red clay and hills in the Panhandle."
  },
  {
    id: "apalachicola-ohv",
    name: "Apalachicola National Forest (Munson Hills OHV)",
    type: "OHV Trail System",
    city: "Tallahassee, FL",
    address: "5705 Woodville Hwy, Tallahassee, FL 32305",
    lat: 30.3665,
    lon: -84.3071,
    hours: "Daily Sunrise to Sunset",
    terrain: "70+ miles of flowing sandy single-track and pine loops",
    requirements: "USFS OHV Permit",
    social: "https://www.fs.usda.gov/apalachicola",
    notes: "Ocala National Forest annual OHV sticker is valid here."
  },
  {
    id: "tates-hell-ohv",
    name: "Tate's Hell State Forest OHV Trail System",
    type: "OHV Trail System",
    city: "Carrabelle, FL",
    address: "290 Airport Rd, Carrabelle, FL 32322",
    lat: 29.8519,
    lon: -84.6934,
    hours: "Daily Sunrise to Sunset",
    terrain: "150+ miles of designated coastal forest dirt roads",
    requirements: "Florida Forest Service State Forest Use Permit",
    social: "https://www.fdacs.gov/",
    notes: "Massive Panhandle dual-sport and off-road adventure network."
  },
  {
    id: "hog-waller",
    name: "Hog Waller Campground & ATV Resort",
    type: "OHV & GNCC Venue",
    city: "Palatka, FL",
    address: "454 County Road 310, Palatka, FL 32177",
    lat: 29.5583,
    lon: -81.8112,
    hours: "Open Select Event Weekends",
    terrain: "1,100 acres of black dirt, deep sand, and mud pits",
    requirements: "Weekend admission pass",
    social: "https://www.hogwallerfl.com/",
    notes: "Home of the Wild Boar GNCC."
  }
];

const MASTER_EVENTS = [
  {
    id: "fl-mx-series-waldo-oct2026",
    title: "Florida Motocross Series - Waldo MX Round",
    location: "Waldo MX - Waldo, FL",
    date: "2026-10-24",
    series: "2026 Florida Motocross Series",
    details: "Oct 24–25, 2026. Saturday Practice 9:00 AM – 2:00 PM | Sunday Racing.",
    url: "https://floridaseries.com/schedule/"
  },
  {
    id: "dcmx-points-oct24-2026",
    title: "DCMX Points Championship - Round 20 (Double Points)",
    location: "Dade City Motocross - 36722 State Rd 52, Dade City, FL 33525",
    date: "2026-10-24",
    series: "Dade City MX Saturday Night Series",
    details: "Gates open 3:00 PM | Practice 5:00 PM | Racing 6:30 PM under the lights.",
    url: "https://dadecitymx.com/special-events/"
  },
  {
    id: "thor-mini-os-2026",
    title: "55th Annual Thor Mini O's (Winter Olympics)",
    location: "Gatorback Cycle Park - 20525 NW 46th Ave, Alachua, FL 32615",
    date: "2026-11-21",
    series: "Unlimited Sports MX / AMA National",
    details: "Nov 21–28, 2026. Thanksgiving week Supercross & Motocross Amateur National.",
    url: "https://unlimitedsportsmx.com/home/events/thor-mini-os/"
  },
  {
    id: "tampa-supercross-2027",
    title: "2027 Monster Energy AMA Supercross - Tampa (250SX East Opener)",
    location: "Raymond James Stadium - 4201 N Dale Mabry Hwy, Tampa, FL 33607",
    date: "2027-02-06",
    series: "AMA Supercross Championship",
    details: "Saturday, Feb 6, 2027. Opening round of the 2027 250SX East Regional Championship.",
    url: "https://www.supercrosslive.com/"
  }
];

export default function App() {
  const [activeTab, setActiveTab] = useState('directory');
  const [selectedTrack, setSelectedTrack] = useState(null);
  
  // Data State pre-loaded and sorted by distance immediately
  const [tracks, setTracks] = useState(() => {
    return MASTER_TRACKS.map(track => {
      const distance = calculateDistance(USER_LOCATION.lat, USER_LOCATION.lon, track.lat, track.lon);
      return { ...track, distance };
    }).sort((a, b) => a.distance - b.distance);
  });
  const [events, setEvents] = useState(MASTER_EVENTS);
  const [refreshing, setRefreshing] = useState(false);

  // Calendar State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(null);

  // Weather State
  const [weatherData, setWeatherData] = useState(null);
  const [loadingWeather, setLoadingWeather] = useState(false);
  
  // Radar State
  const [radarFrames, setRadarFrames] = useState([]);
  const [activeFrameIndex, setActiveFrameIndex] = useState(0);
  const [showRadar, setShowRadar] = useState(true);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      // Re-sort to ensure distance accuracy
      const sorted = MASTER_TRACKS.map(track => {
        const distance = calculateDistance(USER_LOCATION.lat, USER_LOCATION.lon, track.lat, track.lon);
        return { ...track, distance };
      }).sort((a, b) => a.distance - b.distance);
      setTracks(sorted);
      setEvents(MASTER_EVENTS);
      setRefreshing(false);
    }, 500);
  };

  useEffect(() => {
    // Fetch RainViewer Radar Frames
    fetch('https://api.rainviewer.com/public/weather-maps.json')
      .then(res => res.json())
      .then(data => {
        if (data && data.host && data.radar) {
          let frames = [];
          if (data.radar.past) frames = [...data.radar.past];
          if (data.radar.nowcast) frames = [...frames, ...data.radar.nowcast];
          
          const formattedFrames = frames.map(f => {
            const date = new Date(f.time * 1000);
            let hours = date.getHours();
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12 || 12;
            const mins = date.getMinutes().toString().padStart(2, '0');
            return {
              timeText: `${hours}:${mins} ${ampm}`,
              url: `${data.host}${f.path}/256/{z}/{x}/{y}/2/1_1.png`
            };
          });
          setRadarFrames(formattedFrames);
          setActiveFrameIndex(formattedFrames.length > 0 ? formattedFrames.length - 1 : 0);
        }
      })
      .catch(err => console.log('Radar error:', err));
  }, []);

  // --- FETCH LOCAL TRACK WEATHER & 3-DAY FORECAST ---
  useEffect(() => {
    if (selectedTrack && selectedTrack.lat && selectedTrack.lon) {
      setLoadingWeather(true);
      setWeatherData(null);
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${selectedTrack.lat}&longitude=${selectedTrack.lon}&current=temperature_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=America%2FNew_York`)
        .then(res => res.json())
        .then(data => {
          if (data && data.current) setWeatherData(data);
          setLoadingWeather(false);
        })
        .catch(() => setLoadingWeather(false));
    }
  }, [selectedTrack]);

  const getWeatherIcon = (code) => {
    if (code >= 95) return 'thunderstorm';
    if (code >= 51 && code <= 67) return 'rainy';
    if (code >= 45 && code <= 48) return 'cloud';
    if (code > 0 && code <= 3) return 'partly-sunny';
    return 'sunny';
  };

  const getDayWithSuffix = (dayNum) => {
    if (dayNum > 3 && dayNum < 21) return `${dayNum}th`;
    switch (dayNum % 10) {
      case 1: return `${dayNum}st`;
      case 2: return `${dayNum}nd`;
      case 3: return `${dayNum}rd`;
      default: return `${dayNum}th`;
    }
  };

  const formatFriendlyDate = (dateString) => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    if (isNaN(d.getTime())) return dateString;

    const weekday = d.toLocaleDateString('en-US', { weekday: 'long' });
    const monthName = d.toLocaleDateString('en-US', { month: 'long' });
    const dayWithSuf = getDayWithSuffix(d.getDate());
    return `${weekday} ${monthName} ${dayWithSuf} ${d.getFullYear()}`;
  };

  const renderDetailedWeather = () => {
    if (loadingWeather) return <View style={styles.weatherCard}><Text style={styles.weatherLoadingText}>Fetching local forecasts...</Text></View>;
    if (!weatherData || !weatherData.daily) return null;

    return (
      <View style={styles.weatherCard}>
        <View style={styles.weatherHeaderRow}>
          <Ionicons name={getWeatherIcon(weatherData.current.weather_code)} size={42} color="#e67e22" />
          <View style={{ marginLeft: 15 }}>
            <Text style={styles.weatherMainTemp}>{Math.round(weatherData.current.temperature_2m)}°F</Text>
            <Text style={styles.weatherFeelsLike}>Current Surface Temp</Text>
          </View>
        </View>

        <View style={styles.weatherMetricsGrid}>
          <View style={styles.metricItem}>
            <MaterialCommunityIcons name="weather-lightning-rainy" size={24} color="#3498db" />
            <Text style={styles.metricLabel}>Rain Today</Text>
            <Text style={styles.metricValue}>{weatherData.daily.precipitation_probability_max[0]}%</Text>
          </View>
          <View style={styles.metricItem}>
            <MaterialCommunityIcons name="weather-windy" size={24} color="#1abc9c" />
            <Text style={styles.metricLabel}>Live Wind</Text>
            <Text style={styles.metricValue}>{Math.round(weatherData.current.wind_speed_10m)} mph</Text>
          </View>
        </View>

        <View style={styles.forecastContainer}>
          <Text style={styles.forecastTitle}>3-Day Prediction</Text>
          <View style={styles.forecastRow}>
            {[1, 2, 3].map(i => {
              const dayDate = new Date(weatherData.daily.time[i] + 'T12:00:00Z');
              return (
                <View key={i} style={styles.forecastDay}>
                  <Text style={styles.forecastDayText}>{dayDate.toLocaleDateString('en-US', {weekday: 'short'})}</Text>
                  <Ionicons name={getWeatherIcon(weatherData.daily.weather_code[i])} size={24} color="#e67e22" style={{marginVertical: 4}} />
                  <Text style={styles.forecastTemp}>{Math.round(weatherData.daily.temperature_2m_max[i])}°</Text>
                  <Text style={styles.forecastRain}>{weatherData.daily.precipitation_probability_max[i]}% rain</Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>
    );
  };

  const TrackModal = () => (
    <Modal visible={!!selectedTrack} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <TouchableOpacity style={styles.closeButton} onPress={() => setSelectedTrack(null)}>
            <Ionicons name="close-circle" size={32} color="#7f8c8d" />
          </TouchableOpacity>
          
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.modalTitle}>{selectedTrack?.name}</Text>
            <Text style={styles.modalSubtitle}>
              {selectedTrack?.city} • {selectedTrack?.type} 
              {selectedTrack?.distance ? ` • ${Math.round(selectedTrack.distance)} miles away` : ''}
            </Text>

            {renderDetailedWeather()}

            <View style={styles.infoSection}>
              <Text style={styles.sectionHeader}>Facility Details</Text>
              {selectedTrack?.terrain && <Text style={styles.infoText}><Text style={styles.boldText}>Terrain:</Text> {selectedTrack.terrain}</Text>}
              {selectedTrack?.requirements && <Text style={styles.infoText}><Text style={styles.boldText}>Permits/Rules:</Text> {selectedTrack.requirements}</Text>}
              
              <Text style={styles.infoText}>
                <Text style={styles.boldText}>Address: </Text>
                <Text 
                  style={styles.clickableLinkText} 
                  onPress={() => openMapsApp(selectedTrack?.address, selectedTrack?.lat, selectedTrack?.lon)}
                >
                  {selectedTrack?.address} 📍
                </Text>
              </Text>

              <Text style={styles.infoText}><Text style={styles.boldText}>Hours:</Text> {selectedTrack?.hours}</Text>
              <Text style={styles.infoText}><Text style={styles.boldText}>Notes:</Text> {selectedTrack?.notes}</Text>
            </View>

            <TouchableOpacity 
              style={styles.socialButton} 
              onPress={() => {
                if (selectedTrack?.social) Linking.openURL(selectedTrack.social);
              }}
            >
              <MaterialCommunityIcons name="web" size={22} color="#fff" />
              <Text style={styles.socialButtonText}>Official Info & Updates</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const eventsByDate = {};
  events.forEach(ev => {
    if (ev.date) {
      if (!eventsByDate[ev.date]) eventsByDate[ev.date] = [];
      eventsByDate[ev.date].push(ev);
    }
  });

  const sortedUpcomingEvents = [...events].sort((a, b) => new Date(a.date) - new Date(b.date));
  const upcomingFour = selectedCalendarDate 
    ? sortedUpcomingEvents.filter(e => e.date === selectedCalendarDate)
    : sortedUpcomingEvents.slice(0, 4);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>FL MOTO HUB</Text>
      </View>

      {/* DIRECTORY TAB */}
      {activeTab === 'directory' && (
        <View style={styles.tabContent}>
          <FlatList
            data={tracks}
            keyExtractor={(item) => item.id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#e67e22" />}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.trackCard} onPress={() => setSelectedTrack(item)}>
                <View style={styles.trackCardLeft}>
                  <Text style={styles.trackName}>{item.name}</Text>
                  <View style={styles.trackHoursRow}>
                    <Ionicons name="time-outline" size={14} color="#e67e22" />
                    <Text style={styles.trackHours}>{item.hours}</Text>
                  </View>
                  <Text style={styles.trackType}>{item.type} • <Text style={styles.distanceText}>{Math.round(item.distance)} mi away</Text></Text>
                </View>
                <View style={styles.trackCardRight}>
                  <Text style={styles.trackCity}>{item.city.split(',')[0]}</Text>
                  <Ionicons name="chevron-forward" size={18} color="#7f8c8d" />
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* MAP & RADAR TAB */}
      {activeTab === 'map' && (
        <View style={styles.tabContent}>
          <MapView 
            style={styles.map}
            initialRegion={{ latitude: 28.565, longitude: -81.586, latitudeDelta: 3.5, longitudeDelta: 3.5 }}
          >
            {showRadar && radarFrames.length > 0 && (
              <UrlTile urlTemplate={radarFrames[activeFrameIndex].url} zIndex={1} opacity={0.65} />
            )}
            {tracks.filter(t => t.lat && t.lon).map((track) => (
              <Marker key={track.id} coordinate={{ latitude: track.lat, longitude: track.lon }} title={track.name} onCalloutPress={() => setSelectedTrack(track)} />
            ))}
          </MapView>
          
          <View style={styles.radarControls}>
            <View style={styles.radarHeader}>
              <Text style={styles.radarTitle}>Live Radar Timeline</Text>
              <TouchableOpacity onPress={() => setShowRadar(!showRadar)}>
                <Text style={styles.radarToggle}>{showRadar ? 'HIDE' : 'SHOW'}</Text>
              </TouchableOpacity>
            </View>
            {showRadar && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timelineScroll}>
                {radarFrames.map((frame, index) => (
                  <TouchableOpacity 
                    key={index} 
                    style={[styles.timeButton, activeFrameIndex === index && styles.timeButtonActive]}
                    onPress={() => setActiveFrameIndex(index)}
                  >
                    <Text style={[styles.timeText, activeFrameIndex === index && styles.timeTextActive]}>{frame.timeText}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      )}

      {/* EVENTS & CALENDAR TAB */}
      {activeTab === 'events' && (
        <ScrollView style={styles.tabContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#e67e22" />}>
          
          <View style={styles.calendarHeaderContainer}>
            <TouchableOpacity onPress={() => setCurrentDate(new Date(year, month - 1, 1))}>
              <Ionicons name="chevron-back" size={24} color="#e67e22" />
            </TouchableOpacity>
            <Text style={styles.calendarMonthTitle}>{monthNames[month]} {year}</Text>
            <TouchableOpacity onPress={() => setCurrentDate(new Date(year, month + 1, 1))}>
              <Ionicons name="chevron-forward" size={24} color="#e67e22" />
            </TouchableOpacity>
          </View>

          <View style={styles.calendarGrid}>
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d, idx) => (
              <Text key={idx} style={styles.calendarDayHeader}>{d}</Text>
            ))}

            {Array.from({ length: firstDayIndex }).map((_, idx) => (
              <View key={`empty-${idx}`} style={styles.calendarCellEmpty} />
            ))}

            {Array.from({ length: totalDaysInMonth }).map((_, idx) => {
              const dayNum = idx + 1;
              const formattedMonth = String(month + 1).padStart(2, '0');
              const formattedDay = String(dayNum).padStart(2, '0');
              const dateKey = `${year}-${formattedMonth}-${formattedDay}`;
              const hasEvents = eventsByDate[dateKey];
              const isSelected = selectedCalendarDate === dateKey;

              return (
                <TouchableOpacity 
                  key={dateKey} 
                  style={[styles.calendarCell, isSelected && styles.calendarCellSelected, hasEvents && styles.calendarCellHasEvent]}
                  onPress={() => setSelectedCalendarDate(isSelected ? null : dateKey)}
                >
                  <Text style={[styles.calendarCellText, hasEvents && styles.calendarCellTextEvent, isSelected && styles.calendarCellTextSelected]}>
                    {dayNum}
                  </Text>
                  {hasEvents && <View style={styles.eventDot} />}
                </TouchableOpacity>
              );
            })}
          </View>

          {selectedCalendarDate && (
            <TouchableOpacity style={styles.clearFilterButton} onPress={() => setSelectedCalendarDate(null)}>
              <Text style={styles.clearFilterText}>Showing events for {formatFriendlyDate(selectedCalendarDate)} (Tap to show upcoming)</Text>
            </TouchableOpacity>
          )}

          <View style={styles.eventsSectionHeaderContainer}>
            <Text style={styles.sectionHeader}>{selectedCalendarDate ? 'Events on Selected Day' : 'Upcoming Events'}</Text>
          </View>

          {upcomingFour.length === 0 ? (
            <Text style={styles.noEventsText}>No events found for this selection.</Text>
          ) : (
            upcomingFour.map((item) => (
              <View key={item.id} style={styles.eventCard}>
                <View style={styles.eventDateBox}>
                  <Text style={styles.eventDateText}>{formatFriendlyDate(item.date)}</Text>
                </View>
                <View style={styles.eventInfo}>
                  <Text style={styles.eventTitle}>{item.title}</Text>
                  
                  <TouchableOpacity onPress={() => openMapsApp(item.location, null, null)}>
                    <Text style={styles.eventLocationClickable}>{item.location} 📍</Text>
                  </TouchableOpacity>

                  <Text style={styles.eventSeries}>{item.series}</Text>
                  {item.details ? <Text style={styles.eventDetails}>{item.details}</Text> : null}
                  
                  {item.url ? (
                    <TouchableOpacity
                      onPress={() => Linking.openURL(item.url)}
                      style={styles.eventUrlButton}
                    >
                      <Text style={styles.eventUrlButtonText}>View Event / Register ↗</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            ))
          )}
          <View style={{ height: 30 }} />
        </ScrollView>
      )}

      <TrackModal />

      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('directory')}>
          <MaterialCommunityIcons name="format-list-bulleted" size={26} color={activeTab === 'directory' ? '#e67e22' : '#7f8c8d'} />
          <Text style={[styles.navText, activeTab === 'directory' && styles.navTextActive]}>Tracks</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('map')}>
          <MaterialCommunityIcons name="map-marker-radius" size={26} color={activeTab === 'map' ? '#e67e22' : '#7f8c8d'} />
          <Text style={[styles.navText, activeTab === 'map' && styles.navTextActive]}>Map</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('events')}>
          <MaterialCommunityIcons name="calendar-check" size={26} color={activeTab === 'events' ? '#e67e22' : '#7f8c8d'} />
          <Text style={[styles.navText, activeTab === 'events' && styles.navTextActive]}>Events</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f' },
  header: { paddingVertical: 18, backgroundColor: '#181818', borderBottomWidth: 1, borderBottomColor: '#282828' },
  headerTitle: { color: '#e67e22', fontSize: 22, fontWeight: '900', letterSpacing: 2, textAlign: 'center', marginTop: 15 },
  tabContent: { flex: 1 },
  map: { width: '100%', height: '100%' },
  
  radarControls: { position: 'absolute', bottom: 20, left: 10, right: 10, backgroundColor: 'rgba(24,24,24,0.9)', borderRadius: 12, padding: 15, borderWidth: 1, borderColor: '#333' },
  radarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  radarTitle: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  radarToggle: { color: '#e67e22', fontWeight: 'bold', fontSize: 12, letterSpacing: 1 },
  timelineScroll: { flexDirection: 'row' },
  timeButton: { paddingHorizontal: 15, paddingVertical: 8, backgroundColor: '#333', borderRadius: 20, marginRight: 10 },
  timeButtonActive: { backgroundColor: '#e67e22' },
  timeText: { color: '#aaa', fontSize: 12, fontWeight: 'bold' },
  timeTextActive: { color: '#fff' },

  trackCard: { flexDirection: 'row', justifyContent: 'space-between', padding: 18, borderBottomWidth: 1, borderBottomColor: '#222', backgroundColor: '#161616' },
  trackCardLeft: { flex: 1 },
  trackName: { color: '#ffffff', fontSize: 17, fontWeight: '700' },
  trackHoursRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 6 },
  trackHours: { color: '#ccc', fontSize: 13, lineHeight: 18, marginLeft: 5, flex: 1 },
  trackType: { color: '#888', fontSize: 13, marginTop: 4 },
  distanceText: { color: '#e67e22', fontWeight: '700' },
  trackCity: { color: '#e67e22', fontSize: 13, marginRight: 8, fontWeight: '600' },
  trackCardRight: { flexDirection: 'row', alignItems: 'center' },

  calendarHeaderContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, backgroundColor: '#181818', marginTop: 10, marginHorizontal: 12, borderRadius: 10 },
  calendarMonthTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: '#161616', marginHorizontal: 12, padding: 10, borderRadius: 10, marginTop: 10 },
  calendarDayHeader: { width: '14.28%', textAlign: 'center', color: '#777', fontWeight: 'bold', marginBottom: 8, fontSize: 12 },
  calendarCellEmpty: { width: '14.28%', height: 38 },
  calendarCell: { width: '14.28%', height: 38, justifyContent: 'center', alignItems: 'center', marginBottom: 4, borderRadius: 6 },
  calendarCellHasEvent: { backgroundColor: 'rgba(230, 126, 34, 0.2)', borderWidth: 1, borderColor: '#e67e22' },
  calendarCellSelected: { backgroundColor: '#e67e22' },
  calendarCellText: { color: '#ddd', fontSize: 14, fontWeight: '600' },
  calendarCellTextEvent: { color: '#e67e22', fontWeight: 'bold' },
  calendarCellTextSelected: { color: '#fff', fontWeight: 'bold' },
  eventDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#e67e22', position: 'absolute', bottom: 4 },
  clearFilterButton: { marginHorizontal: 12, marginTop: 10, backgroundColor: '#222', padding: 10, borderRadius: 8, alignItems: 'center' },
  clearFilterText: { color: '#e67e22', fontSize: 12, fontWeight: 'bold' },
  eventsSectionHeaderContainer: { marginHorizontal: 15, marginTop: 20, marginBottom: 5 },
  noEventsText: { color: '#777', textAlign: 'center', marginVertical: 20, fontSize: 14 },

  eventCard: { flexDirection: 'row', marginHorizontal: 12, marginVertical: 8, backgroundColor: '#181818', borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: '#282828' },
  eventDateBox: { backgroundColor: '#e67e22', padding: 12, justifyContent: 'center', alignItems: 'center', width: 110 },
  eventDateText: { color: '#fff', fontWeight: '800', textAlign: 'center', fontSize: 12, lineHeight: 16 },
  eventInfo: { padding: 14, flex: 1 },
  eventTitle: { color: '#fff', fontSize: 15, fontWeight: '700' },
  eventLocationClickable: { color: '#3498db', fontSize: 13, marginTop: 3, textDecorationLine: 'underline', fontWeight: '600' },
  eventSeries: { color: '#e67e22', fontSize: 11, marginTop: 4, fontWeight: '800', textTransform: 'uppercase' },
  eventDetails: { color: '#ccc', fontSize: 12, marginTop: 4 },
  eventUrlButton: { marginTop: 8, backgroundColor: '#333', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6, alignSelf: 'flex-start' },
  eventUrlButtonText: { color: '#e67e22', fontWeight: 'bold', fontSize: 12 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#181818', height: '88%', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 22 },
  closeButton: { alignSelf: 'flex-end', marginBottom: 6 },
  modalTitle: { color: '#fff', fontSize: 24, fontWeight: '800' },
  modalSubtitle: { color: '#888', fontSize: 14, marginBottom: 18 },
  weatherCard: { backgroundColor: '#222', padding: 16, borderRadius: 12, marginBottom: 18, borderWidth: 1, borderColor: '#333' },
  weatherHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  weatherMainTemp: { color: '#fff', fontSize: 32, fontWeight: '900' },
  weatherFeelsLike: { color: '#888', fontSize: 13, marginTop: 2, fontWeight: '600', textTransform: 'uppercase' },
  weatherLoadingText: { color: '#888', fontSize: 14, textAlign: 'center', paddingVertical: 10 },
  weatherMetricsGrid: { flexDirection: 'row', justifyContent: 'space-around', borderTopWidth: 1, borderTopColor: '#2e2e2e', paddingTop: 14, paddingBottom: 14 },
  metricItem: { alignItems: 'center' },
  metricLabel: { color: '#777', fontSize: 11, marginTop: 3, fontWeight: '600', textTransform: 'uppercase' },
  metricValue: { color: '#eee', fontSize: 16, fontWeight: '800', marginTop: 1 },
  
  forecastContainer: { borderTopWidth: 1, borderTopColor: '#2e2e2e', paddingTop: 14 },
  forecastTitle: { color: '#777', fontSize: 11, fontWeight: '600', textTransform: 'uppercase', marginBottom: 10, textAlign: 'center' },
  forecastRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 10 },
  forecastDay: { alignItems: 'center' },
  forecastDayText: { color: '#ddd', fontSize: 13, fontWeight: 'bold', textTransform: 'uppercase' },
  forecastTemp: { color: '#fff', fontSize: 14, fontWeight: '800' },
  forecastRain: { color: '#3498db', fontSize: 11, fontWeight: 'bold', marginTop: 2 },

  infoSection: { backgroundColor: '#121212', padding: 16, borderRadius: 12, marginBottom: 18, borderWidth: 1, borderColor: '#222' },
  sectionHeader: { color: '#e67e22', fontSize: 14, fontWeight: '800', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 },
  infoText: { color: '#ddd', fontSize: 14, marginBottom: 8, lineHeight: 20 },
  clickableLinkText: { color: '#3498db', fontWeight: '700', textDecorationLine: 'underline' },
  boldText: { fontWeight: '700', color: '#888' },
  socialButton: { backgroundColor: '#e67e22', flexDirection: 'row', padding: 15, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 25 },
  socialButtonText: { color: '#fff', fontSize: 15, fontWeight: '800', marginLeft: 8 },
  bottomNav: { flexDirection: 'row', backgroundColor: '#181818', borderTopWidth: 1, borderTopColor: '#282828', paddingBottom: 25, paddingTop: 10 },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  navText: { color: '#777', fontSize: 11, marginTop: 3, fontWeight: '600' },
  navTextActive: { color: '#e67e22' },
});