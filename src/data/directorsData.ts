import { DirectorPersona, MediaAsset } from '../types';

export const DIRECTORS: Record<string, DirectorPersona> = {
  chaos: {
    id: 'chaos',
    name: 'Mad Maxwell',
    title: 'Strobe & Chaos Director',
    voicePitch: 0.85,
    voiceRate: 1.25,
    voiceLang: 'en-GB',
    tagline: 'Rules are just guidelines with better color grading.',
    editStyle: 'Fast Strobe Cuts & Glitch Wipes',
    humor: 'Sarcastic & High Velocity',
    color: 'from-rose-500 to-amber-500',
    avatarEmoji: '⚡',
    roastCatchphrases: [
      "This 1080p footage looks like it was shot on a smart toaster in 2008. Archived!",
      "I've seen dial-up buffers move faster than this frame rate. Let's chop it to 24fps fast cuts!",
      "Are we making a documentary or a lullaby? Add glitch cuts or I walk off set!"
    ],
    hypeCatchphrases: [
      "BOOM! Pure 4K sovereign chaos energy right here! This shot is absolute cinema!",
      "Now THAT is main character lighting. Throw a 1.2s strobe transition on it!",
      "Broadcast gold! Youtube algorithm is going to melt when this drops!"
    ]
  },
  zen: {
    id: 'zen',
    name: 'Mist Flow',
    title: 'Tidal & Ambient Director',
    voicePitch: 1.1,
    voiceRate: 0.85,
    voiceLang: 'en-AU',
    tagline: 'Let the footage breathe. Then breathe on the footage.',
    editStyle: 'Fluid Motion Dissolves & Tide-Synced Cuts',
    humor: 'Absurdist & Atmospheric',
    color: 'from-cyan-400 to-purple-400',
    avatarEmoji: '🌊',
    roastCatchphrases: [
      "This clip is vibrating at an uncomfortable frequency. Let's smooth it out with a 3-second cross-fade.",
      "Too much chaos, mortal. Where is the quiet majesty of the 4K void?",
      "The pixels are panicking. Take a deep breath and apply cinematic color grade."
    ],
    hypeCatchphrases: [
      "Ah... sublime. The audio waveform and motion vectors are aligned in perfect harmony.",
      "Notice how the drone shot floats like a whisper over the tide. Perfection.",
      "This 4K master grade will wash over the viewers like a gentle summer wave."
    ]
  },
  sovereign: {
    id: 'sovereign',
    name: 'The Nine',
    title: 'Sovereign Law Director',
    voicePitch: 0.95,
    voiceRate: 1.0,
    voiceLang: 'en-US',
    tagline: 'Every frame is a vote. Every cut is law.',
    editStyle: 'Epic Sovereign Wipe & Golden Ratio Edits',
    humor: 'Dry & Commandingly Precise',
    color: 'from-amber-400 to-emerald-400',
    avatarEmoji: '👑',
    roastCatchphrases: [
      "Key path attributes were missing in this clip. Standard pipeline protocol requires immediate rejection.",
      "This framing violates the Dragon Nine golden ratio by 4.2%. Re-center or face purge.",
      "Unencrypted 1080p b-roll? Unacceptable in a sovereign 4K pipeline."
    ],
    hypeCatchphrases: [
      "Command verified. Sovereign 4K master output primed for instant YouTube deployment.",
      "The clock strikes nine. This broadcast edit commands absolute respect.",
      "Flawless metadata execution. All checksums verified for broadcast delivery."
    ]
  },
  hype: {
    id: 'hype',
    name: 'Hype Timmy',
    title: 'Ultimate Hype Guy & Pitch Engine',
    voicePitch: 1.2,
    voiceRate: 1.35,
    voiceLang: 'en-US',
    tagline: 'LET US GO! WE ARE AUDITING DRIVES AND MAKING 4K BANGER BROADCASTS!',
    editStyle: 'Hyper-Hype Hard Cuts & Bass Drops',
    humor: 'Unfiltered Energy & Maximum Hype',
    color: 'from-yellow-400 to-indigo-500',
    avatarEmoji: '🔥',
    roastCatchphrases: [
      "BRO! Who shot this upside down in a cave?! Let me fix this in Kdenlive real quick!",
      "NO WAY! Where is the bass drop?! We need 4K resolution and 60 FPS, not a slideshow!",
      "This clip is sleeping on us! Wake it up with a hyper-speed ramp!"
    ],
    hypeCatchphrases: [
      "LET'S GOOOOO! DRAGON NINE 4K PIPELINE IS UNSTOPPABLE!",
      "THIS SHOT IS INSANE! 3840x2160 PURE BANGER ENERGY!",
      "HIT THAT SUBSCRIBE BUTTON BEFORE THE RENDER NODE BLOWS UP!"
    ]
  }
};

export const INITIAL_DRIVE_ASSETS: MediaAsset[] = [
  {
    id: 'asset_001',
    filePath: '/home/tim/Videos/drone_broll_coastal_4k.mp4',
    fileName: 'drone_broll_coastal_4k.mp4',
    fileSize: '412.4 MB',
    duration: '00:01:42',
    resolution: '3840x2160',
    fps: 60,
    codec: 'h264',
    thumbnailUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80',
    motionEnergy: 0.88,
    audioMood: 'cinematic',
    bpm: 120,
    sceneCutCount: 14,
    aiTag: 'DRONE-GOLD',
    directorVibe: 'Mad Maxwell',
    inTime: '00:00:05',
    outTime: '00:01:30'
  },
  {
    id: 'asset_002',
    filePath: '/home/tim/Videos/interview_tim_dragon9_master.mov',
    fileName: 'interview_tim_dragon9_master.mov',
    fileSize: '1.2 GB',
    duration: '00:04:15',
    resolution: '3840x2160',
    fps: 24,
    codec: 'prores',
    thumbnailUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=400&q=80',
    motionEnergy: 0.35,
    audioMood: 'chill',
    bpm: 85,
    sceneCutCount: 3,
    aiTag: 'A-ROLL-INTERVIEW',
    directorVibe: 'The Nine',
    inTime: '00:00:12',
    outTime: '00:03:50'
  },
  {
    id: 'asset_003',
    filePath: '/home/tim/Videos/cyberpunk_tokyo_night_drive.mp4',
    fileName: 'cyberpunk_tokyo_night_drive.mp4',
    fileSize: '680.1 MB',
    duration: '00:02:10',
    resolution: '3840x2160',
    fps: 60,
    codec: 'hevc',
    thumbnailUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=400&q=80',
    motionEnergy: 0.95,
    audioMood: 'aggressive',
    bpm: 140,
    sceneCutCount: 28,
    aiTag: 'CYBERPUNK-NIGHT',
    directorVibe: 'Mad Maxwell',
    inTime: '00:00:00',
    outTime: '00:02:00'
  },
  {
    id: 'asset_004',
    filePath: '/home/tim/Videos/misty_forest_stream_ambient.mp4',
    fileName: 'misty_forest_stream_ambient.mp4',
    fileSize: '210.8 MB',
    duration: '00:03:00',
    resolution: '1920x1080',
    fps: 30,
    codec: 'h264',
    thumbnailUrl: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=400&q=80',
    motionEnergy: 0.15,
    audioMood: 'ambient',
    bpm: 60,
    sceneCutCount: 2,
    aiTag: 'B-ROLL-NATURE',
    directorVibe: 'Mist Flow',
    inTime: '00:00:10',
    outTime: '00:02:40'
  },
  {
    id: 'asset_005',
    filePath: '/home/tim/work/enigma-pipeline/storage/corrupt_clip_04.mov',
    fileName: 'corrupt_clip_04.mov',
    fileSize: '45.0 MB',
    duration: '00:00:08',
    resolution: '1280x720',
    fps: 15,
    codec: 'unknown',
    thumbnailUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=400&q=80',
    motionEnergy: 0.05,
    audioMood: 'chill',
    bpm: 0,
    sceneCutCount: 0,
    aiTag: '404-TRASH',
    directorVibe: 'Mad Maxwell',
    inTime: '00:00:00',
    outTime: '00:00:08'
  },
  {
    id: 'asset_006',
    filePath: '/Media/4K_Vault/street_skate_trick_montage.mp4',
    fileName: 'street_skate_trick_montage.mp4',
    fileSize: '890.2 MB',
    duration: '00:01:55',
    resolution: '3840x2160',
    fps: 120,
    codec: 'hevc',
    thumbnailUrl: 'https://images.unsplash.com/photo-1520045892732-304bc3ac5d8e?auto=format&fit=crop&w=400&q=80',
    motionEnergy: 0.92,
    audioMood: 'hype',
    bpm: 150,
    sceneCutCount: 22,
    aiTag: 'CHAOS-STREET',
    directorVibe: 'Hype Timmy',
    inTime: '00:00:04',
    outTime: '00:01:50'
  }
];

export const SAMPLE_PITCH_SCRIPTS = [
  {
    title: "The Sovereign 4K Data Heist",
    hook: "Yo! What if your data pipeline had a personality disorder and decided to edit its own 4K broadcast?",
    body: "We audited 3 gigabytes of raw drives in /home/tim. We found drone ocean shots, ProRes interviews, and one corrupt 720p clip that Mad Maxwell roasted into oblivion. Here's how Enigma Pipeline turns chaos into broadcast law!"
  },
  {
    title: "Wes Anderson Meets Enigma Pipeline",
    hook: "In the quiet corners of dragon9, 18,402 JSON records were waiting for symmetry.",
    body: "Mist Flow gently cross-fades between misty forest streams and pristine feature store tables. Every missing path attribute is forgiven, provided you export in 4K resolution at 24 frames per second."
  },
  {
    title: "100% Autonomous Kdenlive Broadcast",
    hook: "NO HANDS! We generated MLT XML from an API call and rendered a 4K banger in 18 seconds flat!",
    body: "Hype Timmy brought the bass drops while The Nine verified checksum SHA256 integrity. Click the button to launch the render node and claim your sovereign broadcast!"
  }
];
