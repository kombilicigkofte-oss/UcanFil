import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Ban,
  Bookmark,
  CalendarCheck2,
  Crown,
  Image as ImageIcon,
  LogIn,
  LogOut,
  Maximize2,
  Minimize2,
  Package,
  Pause,
  Play,
  RotateCcw,
  Shield,
  ShoppingBag,
  Tag,
  Trophy,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  COSMETIC_BY_ID,
  COSMETIC_CATALOG,
  DEFAULT_COSMETIC_BY_CATEGORY,
  getCosmeticSellPrice,
} from '../data/cosmetics';
import {
  CRATE_TIER_CONFIGS,
  DEFAULT_CRATE_INVENTORY,
  getTotalCrateCount,
} from '../data/crates';
import { NAME_COLOR_CATALOG, NameColorDefinition } from '../data/nameColors';
import {
  RENAME_PEANUT_COST,
  banIpManually,
  banPlayerByUidAndIp,
  checkIfBanned,
  cleanupDuplicateCreatorLeaderboardEntries,
  deleteLeaderboardEntry,
  fetchClientIp,
  fetchSelfLeaderboardEntry,
  fetchCloudUserProgress,
  isUserCreator,
  saveCloudUserProgress,
  saveUserPrivateIp,
  signOutUser,
  submitLeaderboardScore,
  subscribeAuthState,
  subscribeBannedLists,
  subscribeLeaderboard,
  unbanIp,
  unbanUid,
} from '../firebase';
import AuthModal from './AuthModal';
import CreatorPanelModal from './CreatorPanelModal';
import {
  BODY_TYPE_CONFIGS,
  BannedIpRecord,
  BannedUidRecord,
  BodyType,
  Cloud,
  CosmeticCrate,
  CosmeticItem,
  CrateInventoryState,
  CrateTier,
  DIFFICULTY_CONFIGS,
  Difficulty,
  ELEPHANT_RADIUS,
  ElephantState,
  EquippedCosmetics,
  FloatingText,
  GROUND_HEIGHT,
  GameState,
  GameUser,
  LeaderboardEntry,
  Particle,
  PeanutBonus,
  PipePair,
  SavedCharacterPreset,
  UpgradesState,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from '../types/game';
import {
  DailyQuestDefinition,
  DailyQuestsState,
  createEmptyDailyQuestsState,
  getDailyQuestsForDate,
  getTodayDateKey,
} from '../data/dailyQuests';
import { getBiomeTheme, renderGameScene } from '../utils/renderer';
import { soundEngine } from '../utils/sound';
import AvatarExportModal from './AvatarExportModal';
import DailyQuestsModal from './DailyQuestsModal';
import CosmeticSellModal from './CosmeticSellModal';
import LeaderboardModal from './LeaderboardModal';
import RareDropExplosionModal from './RareDropExplosionModal';
import SavedCharactersModal from './SavedCharactersModal';
import ShopModal, { CrateSpinPayload, ShopTab } from './ShopModal';
import StyledPlayerName from './StyledPlayerName';

const HIGH_SCORE_STORAGE_KEY = 'ucan_fil_high_scores_v1';
const PROFILE_STORAGE_KEY = 'ucan_fil_profile_v2';
const DAILY_QUESTS_STORAGE_KEY = 'ucan_fil_daily_quests_v1';
const SAVED_CHARACTERS_STORAGE_KEY = 'ucan_fil_saved_characters_v1';

type HighScoreMap = Record<Difficulty, number>;

const DEFAULT_UNLOCKED_IDS = ['hat_none', 'glasses_none', 'skin_classic', 'trail_none'];
const DEFAULT_NAME_COLORS = ['name_default'];
const DEFAULT_EQUIPPED: EquippedCosmetics = {
  hat: 'hat_none',
  glasses: 'glasses_none',
  skin: 'skin_classic',
  trail: 'trail_none',
  suit: 'suit_none',
};
const DEFAULT_UPGRADES: UpgradesState = {
  magnetLevel: 0,
  doublePeanutLevel: 0,
  shieldCount: 0,
};

interface SavedProfile {
  difficulty: Difficulty;
  bodyType: BodyType;
  peanutBank: number;
  unlockedIds: string[];
  equipped: EquippedCosmetics;
  unlockedNameColors: string[];
  equippedNameColor: string;
  upgrades: UpgradesState;
  crateInventory: CrateInventoryState;
  updatedAtMs: number;
}

function computeIntegritySig(payload: string): string {
  let h = 2166136261;
  const salted = `ucan_fil_savanna_guard_v1:${payload}`;
  for (let i = 0; i < salted.length; i++) {
    h ^= salted.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

function canonicalizeHighScores(raw: Partial<Record<Difficulty, unknown>>): HighScoreMap {
  return {
    easy: Math.max(0, Math.min(999999, Math.floor(Number(raw.easy) || 0))),
    classic: Math.max(0, Math.min(999999, Math.floor(Number(raw.classic) || 0))),
    turbo: Math.max(0, Math.min(999999, Math.floor(Number(raw.turbo) || 0))),
  };
}

function loadHighScores(): HighScoreMap {
  try {
    const raw = localStorage.getItem(HIGH_SCORE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const scores = canonicalizeHighScores(parsed);
      const expected = computeIntegritySig(JSON.stringify(scores));
      if (parsed.sig && parsed.sig !== expected) {
        return { easy: 0, classic: 0, turbo: 0 };
      }
      return scores;
    }
  } catch {
    // Ignore storage errors
  }
  return { easy: 0, classic: 0, turbo: 0 };
}

function saveHighScores(scores: HighScoreMap) {
  try {
    const canonical = canonicalizeHighScores(scores);
    const sig = computeIntegritySig(JSON.stringify(canonical));
    localStorage.setItem(HIGH_SCORE_STORAGE_KEY, JSON.stringify({ ...canonical, sig }));
  } catch {
    // Ignore storage errors
  }
}

function canonicalizeProfile(raw: Partial<SavedProfile>): SavedProfile {
  const rawUnlocked = Array.isArray(raw.unlockedIds) ? raw.unlockedIds.map(String) : [];
  const normalizedUnlocked = rawUnlocked.map((id) => (id === 'skin_tuxedo' ? 'suit_tuxedo' : id));
  const unlockedSet = new Set<string>([...DEFAULT_UNLOCKED_IDS, ...normalizedUnlocked]);
  const sortedUnlocked = Array.from(unlockedSet).sort();
  const unlockedNameColorSet = new Set<string>([
    ...DEFAULT_NAME_COLORS,
    ...(Array.isArray(raw.unlockedNameColors) ? raw.unlockedNameColors.map(String) : []),
  ]);
  const sortedNameColors = Array.from(unlockedNameColorSet).sort();
  const rawSkin = String(raw.equipped?.skin || 'skin_classic');
  const migratedSuit =
    rawSkin === 'skin_tuxedo' ? 'suit_tuxedo' : String(raw.equipped?.suit || 'suit_none');
  const migratedSkin = rawSkin === 'skin_tuxedo' ? 'skin_classic' : rawSkin;
  return {
    difficulty:
      raw.difficulty === 'easy' || raw.difficulty === 'turbo' ? raw.difficulty : 'classic',
    bodyType: raw.bodyType === 'slim' || raw.bodyType === 'chubby' ? raw.bodyType : 'normal',
    peanutBank: Math.max(0, Math.min(9999999, Math.floor(Number(raw.peanutBank) || 0))),
    unlockedIds: sortedUnlocked,
    equipped: {
      hat: String(raw.equipped?.hat || 'hat_none'),
      glasses: String(raw.equipped?.glasses || 'glasses_none'),
      skin: migratedSkin,
      trail: String(raw.equipped?.trail || 'trail_none'),
      suit: migratedSuit,
    },
    unlockedNameColors: sortedNameColors,
    equippedNameColor: String(raw.equippedNameColor || 'name_default'),
    upgrades: {
      magnetLevel: Math.min(5, Math.max(0, Math.floor(Number(raw.upgrades?.magnetLevel) || 0))),
      doublePeanutLevel: Math.min(
        5,
        Math.max(0, Math.floor(Number(raw.upgrades?.doublePeanutLevel) || 0))
      ),
      shieldCount: Math.min(99, Math.max(0, Math.floor(Number(raw.upgrades?.shieldCount) || 0))),
    },
    crateInventory: {
      standard: Math.min(
        9999,
        Math.max(0, Math.floor(Number(raw.crateInventory?.standard) || 0))
      ),
      epic: Math.min(9999, Math.max(0, Math.floor(Number(raw.crateInventory?.epic) || 0))),
      mythic: Math.min(9999, Math.max(0, Math.floor(Number(raw.crateInventory?.mythic) || 0))),
      outfit: Math.min(9999, Math.max(0, Math.floor(Number(raw.crateInventory?.outfit) || 0))),
    },
    updatedAtMs: Math.max(0, Math.floor(Number(raw.updatedAtMs) || 0)),
  };
}

function createDefaultProfile(): SavedProfile {
  return canonicalizeProfile({
    difficulty: 'classic',
    bodyType: 'normal',
    peanutBank: 0,
    unlockedIds: DEFAULT_UNLOCKED_IDS,
    equipped: DEFAULT_EQUIPPED,
    unlockedNameColors: DEFAULT_NAME_COLORS,
    equippedNameColor: 'name_default',
    upgrades: DEFAULT_UPGRADES,
    crateInventory: DEFAULT_CRATE_INVENTORY,
    updatedAtMs: 0,
  });
}

function loadProfile(): SavedProfile {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const cleanProfile = canonicalizeProfile(parsed);
      const expected = computeIntegritySig(JSON.stringify(cleanProfile));
      if (!parsed.sig || parsed.sig === expected) {
        return cleanProfile;
      }
      // Preserve saves created before crateInventory.outfit was added
      const legacyPreOutfitCrate = {
        ...cleanProfile,
        crateInventory: {
          standard: cleanProfile.crateInventory.standard,
          epic: cleanProfile.crateInventory.epic,
          mythic: cleanProfile.crateInventory.mythic,
        },
      };
      if (parsed.sig === computeIntegritySig(JSON.stringify(legacyPreOutfitCrate))) {
        return cleanProfile;
      }
      // Preserve saves created before crateInventory was added
      const legacyPreCrateInventory = {
        difficulty: cleanProfile.difficulty,
        bodyType: cleanProfile.bodyType,
        peanutBank: cleanProfile.peanutBank,
        unlockedIds: cleanProfile.unlockedIds,
        equipped: cleanProfile.equipped,
        unlockedNameColors: cleanProfile.unlockedNameColors,
        equippedNameColor: cleanProfile.equippedNameColor,
        upgrades: cleanProfile.upgrades,
        updatedAtMs: cleanProfile.updatedAtMs,
      };
      if (parsed.sig === computeIntegritySig(JSON.stringify(legacyPreCrateInventory))) {
        return cleanProfile;
      }
      const legacyEquipped = {
        hat: cleanProfile.equipped.hat,
        glasses: cleanProfile.equipped.glasses,
        skin: cleanProfile.equipped.skin,
        trail: cleanProfile.equipped.trail,
      };
      // Preserve saves created before equipped.suit was added
      const legacyPreSuit = {
        ...legacyPreCrateInventory,
        equipped: legacyEquipped,
      };
      if (parsed.sig === computeIntegritySig(JSON.stringify(legacyPreSuit))) {
        return cleanProfile;
      }
      // Preserve saves created before unlockedNameColors/equippedNameColor fields were added
      const legacyV2 = {
        difficulty: cleanProfile.difficulty,
        bodyType: cleanProfile.bodyType,
        peanutBank: cleanProfile.peanutBank,
        unlockedIds: cleanProfile.unlockedIds,
        equipped: legacyEquipped,
        upgrades: cleanProfile.upgrades,
        updatedAtMs: cleanProfile.updatedAtMs,
      };
      if (parsed.sig === computeIntegritySig(JSON.stringify(legacyV2))) {
        return cleanProfile;
      }
      return createDefaultProfile();
    }
  } catch {
    // Ignore storage errors
  }
  return createDefaultProfile();
}

function saveProfile(profile: SavedProfile) {
  try {
    const canonical = canonicalizeProfile(profile);
    const sig = computeIntegritySig(JSON.stringify(canonical));
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify({ ...canonical, sig }));
  } catch {
    // Ignore storage errors
  }
}

function canonicalizeDailyQuests(state: DailyQuestsState): DailyQuestsState {
  const sortedProgress: Record<string, number> = {};
  Object.keys(state.progress || {})
    .sort()
    .slice(0, 10)
    .forEach((k) => {
      sortedProgress[k] = Math.max(0, Math.min(99999, Math.floor(Number(state.progress[k]) || 0)));
    });
  const sortedClaimed = Array.from(new Set((state.claimedIds || []).map(String)))
    .sort()
    .slice(0, 3);
  return {
    dateKey: String(state.dateKey || getTodayDateKey()),
    progress: sortedProgress,
    claimedIds: sortedClaimed,
  };
}

function loadDailyQuests(): DailyQuestsState {
  const todayKey = getTodayDateKey();
  try {
    const raw = localStorage.getItem(DAILY_QUESTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.dateKey === todayKey) {
        const cleanState = canonicalizeDailyQuests({
          dateKey: todayKey,
          progress: parsed.progress && typeof parsed.progress === 'object' ? parsed.progress : {},
          claimedIds: Array.isArray(parsed.claimedIds) ? parsed.claimedIds : [],
        });
        const expected = computeIntegritySig(JSON.stringify(cleanState));
        if (parsed.sig && parsed.sig !== expected) {
          return createEmptyDailyQuestsState(todayKey);
        }
        return cleanState;
      }
    }
  } catch {
    // Ignore storage errors
  }
  return createEmptyDailyQuestsState(todayKey);
}

function saveDailyQuests(state: DailyQuestsState) {
  try {
    const canonical = canonicalizeDailyQuests(state);
    const sig = computeIntegritySig(JSON.stringify(canonical));
    localStorage.setItem(DAILY_QUESTS_STORAGE_KEY, JSON.stringify({ ...canonical, sig }));
  } catch {
    // Ignore storage errors
  }
}

function loadSavedCharacters(): SavedCharacterPreset[] {
  try {
    const raw = localStorage.getItem(SAVED_CHARACTERS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, 12).map((item, idx) => ({
      id: String(item?.id || `preset_${idx}`).slice(0, 48),
      name: String(item?.name || `Kombin #${idx + 1}`).slice(0, 24),
      bodyType: item?.bodyType === 'slim' || item?.bodyType === 'chubby' ? item.bodyType : 'normal',
      equipped: {
        hat: String(item?.equipped?.hat || 'hat_none').slice(0, 40),
        glasses: String(item?.equipped?.glasses || 'glasses_none').slice(0, 40),
        skin: String(item?.equipped?.skin || 'skin_classic').slice(0, 40),
        trail: String(item?.equipped?.trail || 'trail_none').slice(0, 40),
        suit: String(item?.equipped?.suit || 'suit_none').slice(0, 40),
      },
      nameColorId: String(item?.nameColorId || 'name_default').slice(0, 40),
      savedAtMs: Math.max(0, Math.floor(Number(item?.savedAtMs) || Date.now())),
    }));
  } catch {
    return [];
  }
}

function persistSavedCharacters(presets: SavedCharacterPreset[]) {
  try {
    localStorage.setItem(SAVED_CHARACTERS_STORAGE_KEY, JSON.stringify(presets.slice(0, 12)));
  } catch {
    // Ignore storage errors
  }
}

function createInitialClouds(): Cloud[] {
  return [
    { x: 110, y: 78, scale: 0.9, speed: 18, opacity: 0.85 },
    { x: 340, y: 122, scale: 0.7, speed: 12, opacity: 0.7 },
    { x: 580, y: 66, scale: 1.05, speed: 22, opacity: 0.85 },
    { x: 780, y: 138, scale: 0.75, speed: 14, opacity: 0.65 },
  ];
}

function createInitialElephant(): ElephantState {
  return {
    x: 175,
    y: (WORLD_HEIGHT - GROUND_HEIGHT) * 0.45,
    vy: 0,
    rotation: 0,
    earPhase: 0,
    earFlapTimer: 0,
    trunkPhase: 0,
    scarfWave: 0,
    blinkTimer: 2.5,
    isHurt: false,
    invincibleTimer: 0,
  };
}

function getMedalInfo(score: number): { label: string; colorClass: string; ringClass: string } | null {
  if (score >= 100) {
    return { label: 'Savan Efsanesi', colorClass: 'text-cyan-300', ringClass: 'border-cyan-400/50 bg-cyan-500/10' };
  }
  if (score >= 50) {
    return { label: 'Altın Madalya', colorClass: 'text-amber-300', ringClass: 'border-amber-400/50 bg-amber-500/10' };
  }
  if (score >= 25) {
    return { label: 'Gümüş Madalya', colorClass: 'text-slate-200', ringClass: 'border-slate-300/50 bg-slate-300/10' };
  }
  if (score >= 10) {
    return { label: 'Bronz Madalya', colorClass: 'text-orange-300', ringClass: 'border-orange-400/50 bg-orange-500/10' };
  }
  return null;
}

export default function FlappyElephantGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const initialProfile = useRef<SavedProfile>(loadProfile()).current;

  const [gameState, setGameState] = useState<GameState>('TITLE_MENU');
  const [difficulty, setDifficulty] = useState<Difficulty>(initialProfile.difficulty);
  const [bodyType, setBodyType] = useState<BodyType>(initialProfile.bodyType);
  const [peanutBank, setPeanutBank] = useState<number>(initialProfile.peanutBank);
  const [unlockedIds, setUnlockedIds] = useState<string[]>(initialProfile.unlockedIds);
  const [equipped, setEquipped] = useState<EquippedCosmetics>(initialProfile.equipped);
  const [unlockedNameColors, setUnlockedNameColors] = useState<string[]>(
    initialProfile.unlockedNameColors
  );
  const [equippedNameColor, setEquippedNameColor] = useState<string>(
    initialProfile.equippedNameColor
  );
  const [upgrades, setUpgrades] = useState<UpgradesState>(initialProfile.upgrades);
  const [crateInventory, setCrateInventory] = useState<CrateInventoryState>(
    initialProfile.crateInventory
  );
  const [savedCharacters, setSavedCharacters] = useState<SavedCharacterPreset[]>(() =>
    loadSavedCharacters()
  );

  const stageContainerRef = useRef<HTMLDivElement | null>(null);
  const [isNativeFullscreen, setIsNativeFullscreen] = useState<boolean>(false);
  const [isTheaterFullscreen, setIsTheaterFullscreen] = useState<boolean>(false);
  const isFullscreen = isNativeFullscreen || isTheaterFullscreen;

  const [isShopOpen, setIsShopOpen] = useState<boolean>(false);
  const [shopInitialTab, setShopInitialTab] = useState<ShopTab>('market');
  const [isSellOpen, setIsSellOpen] = useState<boolean>(false);
  const [isDailyQuestsOpen, setIsDailyQuestsOpen] = useState<boolean>(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState<boolean>(false);
  const [isAvatarOpen, setIsAvatarOpen] = useState<boolean>(false);
  const [isSavedCharsOpen, setIsSavedCharsOpen] = useState<boolean>(false);
  const [isCreatorPanelOpen, setIsCreatorPanelOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register' | 'guest'>('login');
  const [dailyQuestsState, setDailyQuestsState] = useState<DailyQuestsState>(() =>
    loadDailyQuests()
  );
  const [cloudHydratedUid, setCloudHydratedUid] = useState<string | null>(null);

  // Creator-only gameplay overrides
  const [godMode, setGodMode] = useState<boolean>(false);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);
  const [customDisplayName, setCustomDisplayName] = useState<string>('');
  const [selfLeaderboardMeta, setSelfLeaderboardMeta] = useState<{
    displayName: string;
    hasCustomName: boolean;
    lastNameChangeMs?: number;
  } | null>(null);

  // Firestore Custom Auth, IP Ban & Leaderboard State
  const [user, setUser] = useState<GameUser | null>(null);
  const [leaderboardEntries, setLeaderboardEntries] = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState<boolean>(true);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);
  const [banStatus, setBanStatus] = useState<{ banned: boolean; reason?: string }>({
    banned: false,
  });
  const [bannedIps, setBannedIps] = useState<BannedIpRecord[]>([]);
  const [bannedUids, setBannedUids] = useState<BannedUidRecord[]>([]);
  const [hasActiveShield, setHasActiveShield] = useState<boolean>(false);

  const [score, setScore] = useState<number>(0);
  const [peanutsCollected, setPeanutsCollected] = useState<number>(0);
  const [runDrops, setRunDrops] = useState<CosmeticItem[]>([]);
  const [dropBanner, setDropBanner] = useState<string | null>(null);
  const [rareExplosionItem, setRareExplosionItem] = useState<CosmeticItem | null>(null);
  const [rareExplosionIsTest, setRareExplosionIsTest] = useState<boolean>(false);

  const [highScores, setHighScores] = useState<HighScoreMap>(() => loadHighScores());
  const [isNewRecord, setIsNewRecord] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Mutable refs for 60fps loop
  const gameStateRef = useRef<GameState>('TITLE_MENU');
  const isShopOpenRef = useRef<boolean>(false);
  const isSellOpenRef = useRef<boolean>(false);
  const difficultyRef = useRef<Difficulty>(initialProfile.difficulty);
  const bodyTypeRef = useRef<BodyType>(initialProfile.bodyType);
  const equippedRef = useRef<EquippedCosmetics>(initialProfile.equipped);
  const unlockedIdsRef = useRef<string[]>(initialProfile.unlockedIds);
  const unlockedNameColorsRef = useRef<string[]>(initialProfile.unlockedNameColors);
  const equippedNameColorRef = useRef<string>(initialProfile.equippedNameColor);
  const upgradesRef = useRef<UpgradesState>(initialProfile.upgrades);
  const crateInventoryRef = useRef<CrateInventoryState>(initialProfile.crateInventory);
  const peanutBankRef = useRef<number>(initialProfile.peanutBank);
  const profileUpdatedAtMsRef = useRef<number>(initialProfile.updatedAtMs);
  const isFirstMountRef = useRef<boolean>(true);
  const cloudHydratedUidRef = useRef<string | null>(null);
  const userRef = useRef<GameUser | null>(null);
  const clientIpRef = useRef<{ ipRaw: string; ipKey: string } | null>(null);
  const hasActiveShieldRef = useRef<boolean>(false);
  const godModeRef = useRef<boolean>(false);
  const speedMultiplierRef = useRef<number>(1);
  const customDisplayNameRef = useRef<string>('');

  const scoreRef = useRef<number>(0);
  const runStartMsRef = useRef<number>(0);
  const runPipesPassedRef = useRef<number>(0);
  const runPeanutPickupsRef = useRef<number>(0);
  const highScoresRef = useRef<HighScoreMap>(highScores);
  const gameOverTimestampRef = useRef<number>(0);
  const dropBannerTimerRef = useRef<number>(0);
  const trailTickRef = useRef<number>(0);

  const elephantRef = useRef<ElephantState>(createInitialElephant());
  const pipesRef = useRef<PipePair[]>([]);
  const peanutsRef = useRef<PeanutBonus[]>([]);
  const cratesRef = useRef<CosmeticCrate[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const cloudsRef = useRef<Cloud[]>(createInitialClouds());

  const groundOffsetRef = useRef<number>(0);
  const bgOffsetRef = useRef<number>(0);
  const spawnTimerRef = useRef<number>(0);
  const pipeSpawnCountRef = useRef<number>(0);
  const nextEntityIdRef = useRef<number>(1);
  const flashAlphaRef = useRef<number>(0);
  const timeRef = useRef<number>(0);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);
  useEffect(() => {
    isShopOpenRef.current = isShopOpen;
  }, [isShopOpen]);
  useEffect(() => {
    isSellOpenRef.current = isSellOpen;
  }, [isSellOpen]);
  useEffect(() => {
    difficultyRef.current = difficulty;
  }, [difficulty]);
  useEffect(() => {
    bodyTypeRef.current = bodyType;
  }, [bodyType]);
  useEffect(() => {
    equippedRef.current = equipped;
  }, [equipped]);
  useEffect(() => {
    unlockedIdsRef.current = unlockedIds;
  }, [unlockedIds]);
  useEffect(() => {
    unlockedNameColorsRef.current = unlockedNameColors;
  }, [unlockedNameColors]);
  useEffect(() => {
    equippedNameColorRef.current = equippedNameColor;
  }, [equippedNameColor]);
  useEffect(() => {
    upgradesRef.current = upgrades;
  }, [upgrades]);
  useEffect(() => {
    crateInventoryRef.current = crateInventory;
  }, [crateInventory]);
  useEffect(() => {
    peanutBankRef.current = peanutBank;
  }, [peanutBank]);
  useEffect(() => {
    highScoresRef.current = highScores;
  }, [highScores]);
  useEffect(() => {
    userRef.current = user;
  }, [user]);
  useEffect(() => {
    godModeRef.current = godMode;
  }, [godMode]);
  useEffect(() => {
    speedMultiplierRef.current = speedMultiplier;
  }, [speedMultiplier]);
  useEffect(() => {
    customDisplayNameRef.current = customDisplayName;
  }, [customDisplayName]);

  // Persist locally & to Firestore only after cloud hydration completes
  useEffect(() => {
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
    } else {
      profileUpdatedAtMsRef.current = Date.now();
    }
    saveProfile({
      difficulty,
      bodyType,
      peanutBank,
      unlockedIds,
      equipped,
      unlockedNameColors,
      equippedNameColor,
      upgrades,
      crateInventory,
      updatedAtMs: profileUpdatedAtMsRef.current,
    });
    saveHighScores(highScores);
    saveDailyQuests(dailyQuestsState);
    persistSavedCharacters(savedCharacters);
    if (user && !user.isGuest && cloudHydratedUid === user.uid) {
      saveCloudUserProgress(user.uid, {
        peanutBank,
        bodyType,
        unlockedIds,
        equipped,
        unlockedNameColors,
        equippedNameColor,
        upgrades,
        crateInventory,
        savedCharacters,
        dailyQuestsDate: dailyQuestsState.dateKey,
        dailyQuestsProgress: dailyQuestsState.progress,
        dailyQuestsClaimed: dailyQuestsState.claimedIds,
        preferredDifficulty: difficulty,
        bestEasy: highScores.easy,
        bestClassic: highScores.classic,
        bestTurbo: highScores.turbo,
      }).catch(() => {});
    }
  }, [
    difficulty,
    bodyType,
    peanutBank,
    unlockedIds,
    equipped,
    unlockedNameColors,
    equippedNameColor,
    upgrades,
    crateInventory,
    savedCharacters,
    highScores,
    dailyQuestsState,
    user,
    cloudHydratedUid,
  ]);

  // Keep public leaderboard character preview & animated name color synced
  useEffect(() => {
    if (!user || user.isGuest || cloudHydratedUid !== user.uid) return;
    const timer = window.setTimeout(() => {
      const bestLocal = Math.max(
        highScoresRef.current.easy,
        highScoresRef.current.classic,
        highScoresRef.current.turbo
      );
      submitLeaderboardScore({
        user,
        score: bestLocal,
        difficulty: difficultyRef.current,
        bodyType,
        equipped,
        nameColorId: equippedNameColor,
        syncOutfitOnly: true,
      }).catch(() => {});
    }, 650);
    return () => window.clearTimeout(timer);
  }, [bodyType, equipped, equippedNameColor, user, cloudHydratedUid]);

  const grantCreatorEverything = useCallback(() => {
    const allIds = COSMETIC_CATALOG.filter((c) => !c.dropOnly).map((c) => c.id);
    const allNameColorIds = NAME_COLOR_CATALOG.map((n) => n.id);
    unlockedIdsRef.current = allIds;
    unlockedNameColorsRef.current = allNameColorIds;
    setUnlockedIds(allIds);
    setUnlockedNameColors(allNameColorIds);
    setPeanutBank((prev) => Math.max(prev, 9999));
    setUpgrades({
      magnetLevel: 5,
      doublePeanutLevel: 5,
      shieldCount: 99,
    });
  }, []);

  const grantSecretTuxedo = useCallback(() => {
    setUnlockedIds((prev) => {
      const next = prev.includes('suit_tuxedo') ? prev : [...prev, 'suit_tuxedo'];
      unlockedIdsRef.current = next;
      return next;
    });
    setEquipped((prev) => {
      const next = { ...prev, suit: 'suit_tuxedo' };
      equippedRef.current = next;
      return next;
    });
    soundEngine.playCrateUnlock();
  }, []);

  const grantAllSuits = useCallback(() => {
    const suitIds = COSMETIC_CATALOG.filter((c) => c.category === 'suit').map((c) => c.id);
    setUnlockedIds((prev) => {
      const next = Array.from(new Set([...prev, ...suitIds]));
      unlockedIdsRef.current = next;
      return next;
    });
    soundEngine.playCrateUnlock();
  }, []);

  const grantOutfitCrates = useCallback((amount: number) => {
    setCrateInventory((prev) => ({
      ...prev,
      outfit: Math.min(9999, (prev.outfit || 0) + amount),
    }));
    soundEngine.playCrateUnlock();
  }, []);

  // Check IP ban immediately on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ip = await fetchClientIp();
      if (cancelled) return;
      clientIpRef.current = ip;
      const result = await checkIfBanned(ip.ipKey, userRef.current?.uid);
      if (!cancelled && result.banned && !isUserCreator(userRef.current)) {
        setBanStatus(result);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Subscribe to Firebase Auth
  useEffect(() => {
    let unsubBanned: (() => void) | null = null;
    const unsub = subscribeAuthState(async (nextUser) => {
      cloudHydratedUidRef.current = null;
      setCloudHydratedUid(null);
      setUser(nextUser);
      userRef.current = nextUser;
      if (unsubBanned) {
        unsubBanned();
        unsubBanned = null;
      }

      const ip = clientIpRef.current || (await fetchClientIp());
      clientIpRef.current = ip;

      if (nextUser && !nextUser.isGuest) {
        const creator = isUserCreator(nextUser);
        if (!creator) {
          const banResult = await checkIfBanned(ip.ipKey, nextUser.uid);
          if (banResult.banned) {
            setBanStatus(banResult);
            return;
          }
        } else {
          setBanStatus({ banned: false });
          unsubBanned = subscribeBannedLists(setBannedIps, setBannedUids);
        }

        // Record player IP privately for creator moderation
        saveUserPrivateIp(nextUser.uid, ip.ipKey, ip.ipRaw).catch(() => {});

        if (!creator) {
          setIsCreatorPanelOpen(false);
          setGodMode(false);
          setSpeedMultiplier(1);
        }

        try {
          const [existingSelf, cloud] = await Promise.all([
            fetchSelfLeaderboardEntry(nextUser.uid),
            fetchCloudUserProgress(nextUser.uid),
          ]);

          if (existingSelf) {
            setCustomDisplayName(existingSelf.displayName);
            customDisplayNameRef.current = existingSelf.displayName;
            setSelfLeaderboardMeta({
              displayName: existingSelf.displayName,
              hasCustomName: Boolean(existingSelf.hasCustomName),
              lastNameChangeMs: existingSelf.lastNameChangeMs,
            });
          }

          // Merge high scores across local, cloud progress, and leaderboard entry
          const mergedScores: HighScoreMap = {
            easy: Math.max(highScoresRef.current.easy, cloud?.bestEasy ?? 0),
            classic: Math.max(highScoresRef.current.classic, cloud?.bestClassic ?? 0),
            turbo: Math.max(highScoresRef.current.turbo, cloud?.bestTurbo ?? 0),
          };
          if (existingSelf && existingSelf.bestScore > mergedScores[existingSelf.difficulty]) {
            mergedScores[existingSelf.difficulty] = existingSelf.bestScore;
          }
          highScoresRef.current = mergedScores;
          setHighScores(mergedScores);
          saveHighScores(mergedScores);

          if (cloud) {
            const localUpdated = profileUpdatedAtMsRef.current;
            const localIsEmpty =
              localUpdated === 0 &&
              peanutBankRef.current === 0 &&
              unlockedIdsRef.current.length <= DEFAULT_UNLOCKED_IDS.length;
            const cloudIsNewer =
              cloud.updatedAtMs !== undefined && cloud.updatedAtMs > localUpdated + 1500;

            if (localIsEmpty || cloudIsNewer) {
              const mergedUnlocked = Array.from(
                new Set([...DEFAULT_UNLOCKED_IDS, ...cloud.unlockedIds])
              ).sort();
              const mergedNameColors = Array.from(
                new Set([...DEFAULT_NAME_COLORS, ...(cloud.unlockedNameColors || [])])
              ).sort();
              profileUpdatedAtMsRef.current = cloud.updatedAtMs ?? Date.now();
              setPeanutBank(cloud.peanutBank);
              setBodyType(cloud.bodyType);
              if (cloud.preferredDifficulty) {
                setDifficulty(cloud.preferredDifficulty);
              }
              setEquipped(cloud.equipped);
              setUnlockedIds(mergedUnlocked);
              setUnlockedNameColors(mergedNameColors);
              unlockedNameColorsRef.current = mergedNameColors;
              if (cloud.equippedNameColor) {
                setEquippedNameColor(cloud.equippedNameColor);
                equippedNameColorRef.current = cloud.equippedNameColor;
              }
              setUpgrades(cloud.upgrades);
              if (cloud.crateInventory) {
                setCrateInventory(cloud.crateInventory);
                crateInventoryRef.current = cloud.crateInventory;
              }
            } else if (!creator) {
              setPeanutBank((prev) => Math.max(prev, cloud.peanutBank));
              setUnlockedIds((prev) =>
                Array.from(new Set([...DEFAULT_UNLOCKED_IDS, ...prev, ...cloud.unlockedIds])).sort()
              );
              setUnlockedNameColors((prev) =>
                Array.from(
                  new Set([
                    ...DEFAULT_NAME_COLORS,
                    ...prev,
                    ...(cloud.unlockedNameColors || []),
                  ])
                ).sort()
              );
              setUpgrades((prev) => ({
                magnetLevel: Math.max(prev.magnetLevel, cloud.upgrades.magnetLevel),
                doublePeanutLevel: Math.max(
                  prev.doublePeanutLevel,
                  cloud.upgrades.doublePeanutLevel
                ),
                shieldCount: Math.max(prev.shieldCount, cloud.upgrades.shieldCount),
              }));
              if (cloud.crateInventory) {
                setCrateInventory((prev) => ({
                  standard: Math.max(prev.standard, cloud.crateInventory!.standard),
                  epic: Math.max(prev.epic, cloud.crateInventory!.epic),
                  mythic: Math.max(prev.mythic, cloud.crateInventory!.mythic),
                  outfit: Math.max(prev.outfit || 0, cloud.crateInventory!.outfit || 0),
                }));
              }
            }

            const todayKey = getTodayDateKey();
            if (cloud.dailyQuestsDate === todayKey) {
              setDailyQuestsState((prev) => {
                const base =
                  prev.dateKey === todayKey ? prev : createEmptyDailyQuestsState(todayKey);
                const mergedProgress: Record<string, number> = { ...base.progress };
                if (cloud.dailyQuestsProgress) {
                  Object.entries(cloud.dailyQuestsProgress).forEach(([k, v]) => {
                    mergedProgress[k] = Math.max(mergedProgress[k] || 0, v);
                  });
                }
                const mergedClaimed = Array.from(
                  new Set([...base.claimedIds, ...(cloud.dailyQuestsClaimed || [])])
                ).slice(0, 3);
                return {
                  dateKey: todayKey,
                  progress: mergedProgress,
                  claimedIds: mergedClaimed,
                };
              });
            }

            if (Array.isArray(cloud.savedCharacters) && cloud.savedCharacters.length > 0) {
              setSavedCharacters((prev) => {
                const byId = new Map<string, SavedCharacterPreset>();
                for (const p of prev) byId.set(p.id, p);
                for (const cp of cloud.savedCharacters!) {
                  if (!byId.has(cp.id)) {
                    byId.set(cp.id, cp);
                  }
                }
                return Array.from(byId.values()).slice(0, 12);
              });
            }
          }

          // Only auto-grant creator starter pack on fresh/nearly-empty inventory so custom choices & sells persist across F5
          const currentUnlockedLen = Math.max(
            unlockedIdsRef.current.length,
            cloud?.unlockedIds.length ?? 0
          );
          if (creator && currentUnlockedLen <= DEFAULT_UNLOCKED_IDS.length + 2 && peanutBankRef.current < 100 && (cloud?.peanutBank ?? 0) < 100) {
            grantCreatorEverything();
          } else if (
            creator &&
            Math.max(
              unlockedNameColorsRef.current.length,
              cloud?.unlockedNameColors?.length ?? 0
            ) <= 1
          ) {
            const allNameColorIds = NAME_COLOR_CATALOG.map((n) => n.id);
            unlockedNameColorsRef.current = allNameColorIds;
            setUnlockedNameColors(allNameColorIds);
          }

          cloudHydratedUidRef.current = nextUser.uid;
          setCloudHydratedUid(nextUser.uid);

          const bestLocal = Math.max(mergedScores.easy, mergedScores.classic, mergedScores.turbo);
          const syncRes = await submitLeaderboardScore({
            user: nextUser,
            score: bestLocal,
            difficulty: difficultyRef.current,
            bodyType: bodyTypeRef.current,
            equipped: equippedRef.current,
            nameColorId: equippedNameColorRef.current,
            forceWrite: creator,
          });
          setCustomDisplayName(syncRes.displayName);
          customDisplayNameRef.current = syncRes.displayName;
          setSelfLeaderboardMeta({
            displayName: syncRes.displayName,
            hasCustomName: syncRes.hasCustomName,
            lastNameChangeMs: syncRes.lastNameChangeMs,
          });

          if (creator) {
            cleanupDuplicateCreatorLeaderboardEntries(nextUser)
              .then(({ highestMergedScore }) => {
                if (highestMergedScore > bestLocal) {
                  const boosted = {
                    ...highScoresRef.current,
                    [difficultyRef.current]: Math.max(
                      highScoresRef.current[difficultyRef.current],
                      highestMergedScore
                    ),
                  };
                  highScoresRef.current = boosted;
                  setHighScores(boosted);
                  saveHighScores(boosted);
                }
              })
              .catch(() => {});
          }
        } catch {
          cloudHydratedUidRef.current = nextUser.uid;
          setCloudHydratedUid(nextUser.uid);
        }
      } else if (nextUser && nextUser.isGuest) {
        cloudHydratedUidRef.current = null;
        setCloudHydratedUid(null);
        setCustomDisplayName(nextUser.displayName);
        customDisplayNameRef.current = nextUser.displayName;
        setSelfLeaderboardMeta(null);
        setIsCreatorPanelOpen(false);
        setGodMode(false);
        setSpeedMultiplier(1);
        setBannedIps([]);
        setBannedUids([]);
        const banResult = await checkIfBanned(ip.ipKey, nextUser.uid);
        setBanStatus(banResult);
      } else {
        cloudHydratedUidRef.current = null;
        setCloudHydratedUid(null);
        setCustomDisplayName('');
        customDisplayNameRef.current = '';
        setSelfLeaderboardMeta(null);
        setIsCreatorPanelOpen(false);
        setGodMode(false);
        setSpeedMultiplier(1);
        setBannedIps([]);
        setBannedUids([]);
        const banResult = await checkIfBanned(ip.ipKey);
        setBanStatus(banResult);
      }
    });
    return () => {
      unsub();
      if (unsubBanned) unsubBanned();
    };
  }, [grantCreatorEverything]);

  // Subscribe to real-time Leaderboard
  useEffect(() => {
    const unsub = subscribeLeaderboard(
      (entries) => {
        setLeaderboardEntries(entries);
        setLeaderboardLoading(false);
        setLeaderboardError(null);
        const currentUid = userRef.current?.uid;
        if (currentUid) {
          const selfEntry = entries.find((e) => e.uid === currentUid);
          if (selfEntry) {
            setCustomDisplayName(selfEntry.displayName);
            customDisplayNameRef.current = selfEntry.displayName;
            setSelfLeaderboardMeta({
              displayName: selfEntry.displayName,
              hasCustomName: Boolean(selfEntry.hasCustomName),
              lastNameChangeMs: selfEntry.lastNameChangeMs,
            });
          }
        }
      },
      (err) => {
        setLeaderboardLoading(false);
        setLeaderboardError(err.message);
      }
    );
    return () => unsub();
  }, []);

  const showBanner = useCallback((msg: string, duration = 2800) => {
    setDropBanner(msg);
    if (dropBannerTimerRef.current) window.clearTimeout(dropBannerTimerRef.current);
    dropBannerTimerRef.current = window.setTimeout(() => setDropBanner(null), duration);
  }, []);

  const advanceDailyQuests = useCallback(
    (event: 'pipe' | 'peanut' | 'crate' | 'run_end') => {
      const todayKey = getTodayDateKey();
      const todaysQuests = getDailyQuestsForDate(todayKey);
      const currentScore = scoreRef.current;
      const activeBody = bodyTypeRef.current;
      const activeDiff = difficultyRef.current;
      const pipesThisRun = runPipesPassedRef.current;
      const peanutsThisRun = runPeanutPickupsRef.current;

      setDailyQuestsState((prev) => {
        const base = prev.dateKey === todayKey ? prev : createEmptyDailyQuestsState(todayKey);
        const nextProgress: Record<string, number> = { ...base.progress };
        let changed = base.dateKey !== prev.dateKey;
        let newlyCompletedQuest: DailyQuestDefinition | null = null;

        for (const q of todaysQuests) {
          const oldVal = nextProgress[q.id] || 0;
          let nextVal = oldVal;

          if (event === 'pipe') {
            if (q.metric === 'pipes_total') nextVal = oldVal + 1;
            if (q.metric === 'pipes_single') nextVal = Math.max(oldVal, pipesThisRun);
          } else if (event === 'peanut') {
            if (q.metric === 'peanuts_total') nextVal = oldVal + 1;
            if (q.metric === 'peanuts_single') nextVal = Math.max(oldVal, peanutsThisRun);
          } else if (event === 'crate') {
            if (q.metric === 'crates_total') nextVal = oldVal + 1;
          } else if (event === 'run_end') {
            if (q.metric === 'runs_total') nextVal = oldVal + 1;
          }

          if (q.metric === 'body_score' && q.requiredBodyType === activeBody) {
            nextVal = Math.max(oldVal, currentScore);
          }
          if (q.metric === 'diff_score' && q.requiredDifficulty === activeDiff) {
            nextVal = Math.max(oldVal, currentScore);
          }

          nextVal = Math.min(q.target, nextVal);
          if (nextVal !== oldVal) {
            nextProgress[q.id] = nextVal;
            changed = true;
            if (oldVal < q.target && nextVal >= q.target) {
              newlyCompletedQuest = q;
            }
          }
        }

        if (newlyCompletedQuest) {
          showBanner(
            `Görev Tamamlandı: ${newlyCompletedQuest.title} (+${newlyCompletedQuest.rewardPeanuts}F)`,
            3000
          );
        }

        return changed ? { ...base, progress: nextProgress } : prev;
      });
    },
    [showBanner]
  );

  const handleClaimQuestReward = useCallback(
    (quest: DailyQuestDefinition) => {
      const todayKey = getTodayDateKey();
      setDailyQuestsState((prev) => {
        const base = prev.dateKey === todayKey ? prev : createEmptyDailyQuestsState(todayKey);
        const val = base.progress[quest.id] || 0;
        if (val < quest.target || base.claimedIds.includes(quest.id)) return prev;
        setPeanutBank((p) => p + quest.rewardPeanuts);
        soundEngine.playCrateUnlock();
        return {
          ...base,
          claimedIds: [...base.claimedIds, quest.id],
        };
      });
    },
    []
  );

  const handleClaimAllQuestRewards = useCallback(() => {
    const todayKey = getTodayDateKey();
    const todaysQuests = getDailyQuestsForDate(todayKey);
    setDailyQuestsState((prev) => {
      const base = prev.dateKey === todayKey ? prev : createEmptyDailyQuestsState(todayKey);
      let totalReward = 0;
      const nextClaimed = [...base.claimedIds];
      for (const q of todaysQuests) {
        if ((base.progress[q.id] || 0) >= q.target && !nextClaimed.includes(q.id)) {
          totalReward += q.rewardPeanuts;
          nextClaimed.push(q.id);
        }
      }
      if (totalReward <= 0) return prev;
      setPeanutBank((p) => p + totalReward);
      soundEngine.playCrateUnlock();
      return {
        ...base,
        claimedIds: nextClaimed,
      };
    });
  }, []);

  const spawnTrailParticles = useCallback((x: number, y: number, count: number, isFlap: boolean) => {
    const trailItem = COSMETIC_BY_ID[equippedRef.current.trail] || COSMETIC_BY_ID['trail_none'];
    const rainbowPalette = ['#EF4444', '#F97316', '#FACC15', '#22C55E', '#38BDF8', '#A855F7'];

    for (let i = 0; i < count; i++) {
      let color = trailItem.previewColor;
      let type: Particle['type'] = 'puff';

      if (trailItem.shape === 'rainbow' || trailItem.shape === 'confetti') {
        color = rainbowPalette[Math.floor(Math.random() * rainbowPalette.length)];
        type = 'spark';
      } else if (trailItem.shape === 'aurora') {
        color = i % 2 === 0 ? '#2DD4BF' : '#A855F7';
        type = 'puff';
      } else if (trailItem.shape === 'royal') {
        color = i % 2 === 0 ? '#9333EA' : '#FACC15';
        type = 'spark';
      } else if (trailItem.shape === 'ring') {
        type = 'ring';
      } else if (trailItem.shape === 'spark') {
        type = 'spark';
      }

      particlesRef.current.push({
        x: x - 16 + (Math.random() - 0.5) * 10,
        y: y + 4 + (Math.random() - 0.5) * 12,
        vx: (isFlap ? -75 : -45) - Math.random() * 65,
        vy: (isFlap ? 28 : 0) + (Math.random() - 0.5) * 70,
        size: isFlap ? 4 + Math.random() * 4 : 3 + Math.random() * 2.5,
        life: 0.36 + Math.random() * 0.2,
        maxLife: 0.56,
        color,
        type,
      });
    }
  }, []);

  const spawnCrashParticles = useCallback((x: number, y: number, isShieldBreak = false) => {
    for (let i = 0; i < 18; i++) {
      const angle = (Math.PI * 2 * i) / 18 + Math.random() * 0.3;
      const speed = 90 + Math.random() * 170;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3.5 + Math.random() * 4.5,
        life: 0.45 + Math.random() * 0.25,
        maxLife: 0.7,
        color: isShieldBreak
          ? i % 2 === 0
            ? '#38BDF8'
            : '#E0F2FE'
          : i % 3 === 0
            ? '#FBBF24'
            : i % 2 === 0
              ? '#F87171'
              : '#FFFFFF',
        type: 'spark',
      });
    }
  }, []);

  const spawnPeanutParticles = useCallback((x: number, y: number) => {
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12;
      const speed = 70 + Math.random() * 90;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 3,
        life: 0.4 + Math.random() * 0.15,
        maxLife: 0.55,
        color: i % 2 === 0 ? '#FDE047' : '#F59E0B',
        type: 'spark',
      });
    }
  }, []);

  const spawnCrateParticles = useCallback((x: number, y: number) => {
    const colors = ['#A855F7', '#FACC15', '#38BDF8', '#F472B6'];
    for (let i = 0; i < 20; i++) {
      const angle = (Math.PI * 2 * i) / 20;
      const speed = 80 + Math.random() * 130;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 4 + Math.random() * 3.5,
        life: 0.55 + Math.random() * 0.2,
        maxLife: 0.75,
        color: colors[i % colors.length],
        type: 'spark',
      });
    }
  }, []);

  const unlockAndEquipCrateDrop = useCallback(
    (cx: number, cy: number) => {
      const unlockedSet = new Set(unlockedIdsRef.current);
      const tuxedoItem = COSMETIC_BY_ID['suit_tuxedo'];
      const hitTuxedo = Boolean(
        tuxedoItem && !unlockedSet.has(tuxedoItem.id) && Math.random() < 1 / 100000
      );
      const lockedNormalItems = COSMETIC_CATALOG.filter(
        (item) => !item.dropOnly && !unlockedSet.has(item.id)
      );

      spawnCrateParticles(cx, cy);

      const dropped = hitTuxedo
        ? tuxedoItem
        : lockedNormalItems.length > 0
          ? lockedNormalItems[Math.floor(Math.random() * lockedNormalItems.length)]
          : null;

      const crateScoreBonus = difficultyRef.current === 'turbo' ? 8 : 5;
      if (dropped) {
        const nextUnlocked = [...unlockedIdsRef.current, dropped.id];
        unlockedIdsRef.current = nextUnlocked;
        setUnlockedIds(nextUnlocked);

        const nextEquipped: EquippedCosmetics = {
          ...equippedRef.current,
          [dropped.category]: dropped.id,
        };
        equippedRef.current = nextEquipped;
        setEquipped(nextEquipped);

        scoreRef.current += crateScoreBonus;
        setScore(scoreRef.current);
        if (dropped.id === 'suit_tuxedo') {
          if (gameStateRef.current === 'PLAYING') {
            gameStateRef.current = 'PAUSED';
            setGameState('PAUSED');
          }
          setRareExplosionIsTest(false);
          setRareExplosionItem(dropped);
        } else {
          soundEngine.playCrateUnlock();
        }
        setRunDrops((prev) => [...prev, dropped]);
        showBanner(
          dropped.id === 'suit_tuxedo'
            ? "İNANILMAZ ŞANS (100.000'de 1): Kraliyet Smokin Çıktı!"
            : `Kutudan Çıktı: ${dropped.name}! (+${crateScoreBonus} Skor)`,
          dropped.id === 'suit_tuxedo' ? 5000 : 3200
        );

        floatingTextsRef.current.push({
          x: cx,
          y: cy - 16,
          text: dropped.id === 'suit_tuxedo' ? 'SMOKİN!' : `${dropped.name}!`,
          color: dropped.id === 'suit_tuxedo' ? '#FB7185' : '#E879F9',
          life: 1.05,
          maxLife: 1.05,
        });
      } else {
        scoreRef.current += crateScoreBonus;
        setScore(scoreRef.current);
        setPeanutBank((prev) => prev + 5);
        setPeanutsCollected((prev) => prev + 5);
        showBanner(`Tüm kozmetikler açık · +5 Fıstık & +${crateScoreBonus} Skor!`);

        floatingTextsRef.current.push({
          x: cx,
          y: cy - 16,
          text: '+5 Fıstık!',
          color: '#FDE047',
          life: 0.9,
          maxLife: 0.9,
        });
      }
    },
    [showBanner, spawnCrateParticles]
  );

  const resetWorld = useCallback(() => {
    elephantRef.current = createInitialElephant();
    pipesRef.current = [];
    peanutsRef.current = [];
    cratesRef.current = [];
    particlesRef.current = [];
    floatingTextsRef.current = [];
    spawnTimerRef.current = 1.1;
    pipeSpawnCountRef.current = 0;
    runPipesPassedRef.current = 0;
    runPeanutPickupsRef.current = 0;
    flashAlphaRef.current = 0;
    scoreRef.current = 0;
    const shieldReady = upgradesRef.current.shieldCount > 0;
    hasActiveShieldRef.current = shieldReady;
    setHasActiveShield(shieldReady);
    setScore(0);
    setPeanutsCollected(0);
    setRunDrops([]);
    setDropBanner(null);
    setIsNewRecord(false);
  }, []);

  const flap = useCallback(() => {
    const cfg = DIFFICULTY_CONFIGS[difficultyRef.current];
    const bodyCfg = BODY_TYPE_CONFIGS[bodyTypeRef.current];
    const el = elephantRef.current;
    el.vy = cfg.flapVelocity * bodyCfg.flapMult;
    el.earFlapTimer = 0.28;
    spawnTrailParticles(el.x, el.y, 6, true);
    soundEngine.playFlap();
  }, [spawnTrailParticles]);

  const startGame = useCallback(() => {
    setIsShopOpen(false);
    setIsSellOpen(false);
    setIsLeaderboardOpen(false);
    resetWorld();
    runStartMsRef.current = performance.now();
    gameStateRef.current = 'PLAYING';
    setGameState('PLAYING');
    flap();
  }, [flap, resetWorld]);

  const triggerGameOver = useCallback(() => {
    if (gameStateRef.current === 'GAME_OVER') return;

    const el = elephantRef.current;
    el.isHurt = true;
    flashAlphaRef.current = 0.72;
    spawnCrashParticles(el.x, el.y);
    soundEngine.playCrash();

    const currentScore = scoreRef.current;
    const diff = difficultyRef.current;
    const prevBest = highScoresRef.current[diff];
    const runElapsedSec = Math.max(0.5, (performance.now() - runStartMsRef.current) / 1000);
    const maxPlausibleScore = Math.ceil(
      runElapsedSec * (diff === 'turbo' ? 11 : 5) + (diff === 'turbo' ? 35 : 20)
    );
    const isPlausible = isUserCreator(userRef.current) || currentScore <= maxPlausibleScore;

    if (isPlausible && currentScore > prevBest) {
      const updated = { ...highScoresRef.current, [diff]: currentScore };
      highScoresRef.current = updated;
      setHighScores(updated);
      saveHighScores(updated);
      setIsNewRecord(true);
    }

    // Submit score to Firestore Leaderboard if logged into registered account
    if (isPlausible && userRef.current && !userRef.current.isGuest) {
      submitLeaderboardScore({
        user: userRef.current,
        score: currentScore,
        difficulty: diff,
        bodyType: bodyTypeRef.current,
        equipped: equippedRef.current,
        nameColorId: equippedNameColorRef.current,
      }).catch(() => {});
    }

    if (runElapsedSec >= 1.2) {
      advanceDailyQuests('run_end');
    }

    gameOverTimestampRef.current = performance.now();
    gameStateRef.current = 'GAME_OVER';
    setGameState('GAME_OVER');
  }, [advanceDailyQuests, spawnCrashParticles]);

  const togglePause = useCallback(() => {
    if (gameStateRef.current === 'PLAYING') {
      gameStateRef.current = 'PAUSED';
      setGameState('PAUSED');
    } else if (gameStateRef.current === 'PAUSED') {
      gameStateRef.current = 'PLAYING';
      setGameState('PLAYING');
    }
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      soundEngine.setMuted(next);
      return next;
    });
  }, []);

  const handleCanvasAction = useCallback(() => {
    if (
      isShopOpen ||
      isSellOpen ||
      isDailyQuestsOpen ||
      isLeaderboardOpen ||
      isAvatarOpen ||
      isCreatorPanelOpen ||
      isAuthModalOpen
    ) {
      return;
    }
    const state = gameStateRef.current;
    if (state === 'PLAYING') {
      flap();
    } else if (state === 'PAUSED') {
      togglePause();
    }
  }, [
    flap,
    isAuthModalOpen,
    isAvatarOpen,
    isCreatorPanelOpen,
    isDailyQuestsOpen,
    isLeaderboardOpen,
    isSellOpen,
    isShopOpen,
    togglePause,
  ]);

  // Shop Handlers
  const handleSelectOrBuyCosmetic = (item: CosmeticItem) => {
    const isUnlocked = unlockedIds.includes(item.id);
    if (isUnlocked) {
      setEquipped((prev) => {
        if (item.category === 'suit' && prev.suit === item.id) {
          return { ...prev, suit: 'suit_none' };
        }
        return { ...prev, [item.category]: item.id };
      });
      soundEngine.playScore();
      return;
    }

    if (item.dropOnly) return;

    if (peanutBank >= item.cost) {
      setPeanutBank((prev) => prev - item.cost);
      setUnlockedIds((prev) => [...prev, item.id]);
      setEquipped((prev) => ({ ...prev, [item.category]: item.id }));
      soundEngine.playCrateUnlock();
    }
  };

  const handleEquipCosmetic = (item: CosmeticItem) => {
    setEquipped((prev) => ({ ...prev, [item.category]: item.id }));
    soundEngine.playScore();
  };

  const handleSelectOrBuyNameColor = (item: NameColorDefinition) => {
    const isUnlocked = item.id === 'name_default' || unlockedNameColors.includes(item.id);
    if (isUnlocked) {
      setEquippedNameColor(item.id);
      equippedNameColorRef.current = item.id;
      soundEngine.playScore();
      return;
    }

    if (peanutBank >= item.cost) {
      setPeanutBank((prev) => prev - item.cost);
      setUnlockedNameColors((prev) => {
        const next = Array.from(new Set([...prev, item.id])).sort();
        unlockedNameColorsRef.current = next;
        return next;
      });
      setEquippedNameColor(item.id);
      equippedNameColorRef.current = item.id;
      soundEngine.playCrateUnlock();
    }
  };

  const rollCrateDrops = (tier: CrateTier, crateCount: number) => {
    const cfg = CRATE_TIER_CONFIGS[tier];
    const totalSlots = crateCount * cfg.dropsPerOpen;
    const unlockedSet = new Set(unlockedIds);
    const tuxedoItem = COSMETIC_BY_ID['suit_tuxedo'];
    const allSecretSuits = COSMETIC_CATALOG.filter((c) => c.category === 'suit');
    const pickedItems: CosmeticItem[] = [];
    const newlyUnlockedIds: string[] = [];
    let duplicateCount = 0;
    let hitOutfitCount = 0;

    for (let slot = 0; slot < totalSlots; slot++) {
      if (tier === 'outfit') {
        // Check rarest-to-easiest or cumulative drop rates:
        // suit_police has 1/5000, down to suit_tuxedo at 1/100000
        const lockedSuits = allSecretSuits
          .filter((s) => !unlockedSet.has(s.id) && (s.dropRateChance ?? 0) > 0)
          .sort((a, b) => (a.dropRateChance ?? 0) - (b.dropRateChance ?? 0));

        const roll = Math.random();
        let cursor = 0;
        let wonSuit: CosmeticItem | null = null;
        for (const s of lockedSuits) {
          cursor += s.dropRateChance ?? 0;
          if (roll < cursor) {
            wonSuit = s;
            break;
          }
        }

        if (wonSuit) {
          unlockedSet.add(wonSuit.id);
          newlyUnlockedIds.push(wonSuit.id);
          pickedItems.push(wonSuit);
          hitOutfitCount++;
          continue;
        }
      } else {
        const hitTuxedo = Boolean(
          tuxedoItem && !unlockedSet.has(tuxedoItem.id) && Math.random() < 1 / 100000
        );

        if (hitTuxedo && tuxedoItem) {
          unlockedSet.add(tuxedoItem.id);
          newlyUnlockedIds.push(tuxedoItem.id);
          pickedItems.push(tuxedoItem);
          continue;
        }
      }

      const availableNormal = COSMETIC_CATALOG.filter(
        (c) => !c.dropOnly && !unlockedSet.has(c.id)
      );

      if (availableNormal.length > 0) {
        const availableMythic = availableNormal.filter((c) => c.rarity === 'mythic');
        const availableHigh = availableNormal.filter(
          (c) => c.rarity === 'legendary' || c.rarity === 'epic'
        );
        const mythicChance =
          tier === 'mythic'
            ? slot % cfg.dropsPerOpen === 0
              ? 1
              : 0.55
            : tier === 'outfit'
              ? 0.25
              : tier === 'epic'
                ? 0.18
                : 0.05;

        let pool = availableNormal;
        if (availableMythic.length > 0 && Math.random() < mythicChance) {
          pool = availableMythic;
        } else if (
          (tier === 'epic' || tier === 'mythic' || tier === 'outfit') &&
          availableHigh.length > 0
        ) {
          pool = availableHigh;
        }
        const chosen = pool[Math.floor(Math.random() * pool.length)];
        unlockedSet.add(chosen.id);
        newlyUnlockedIds.push(chosen.id);
        pickedItems.push(chosen);
      } else {
        const mythicShowcase = COSMETIC_CATALOG.filter(
          (c) => c.cost > 0 && !c.dropOnly && c.rarity === 'mythic'
        );
        const highTierShowcase = COSMETIC_CATALOG.filter(
          (c) => c.cost > 0 && !c.dropOnly && (c.rarity === 'legendary' || c.rarity === 'epic')
        );
        const fallbackPool =
          tier === 'mythic' && mythicShowcase.length > 0
            ? mythicShowcase
            : (tier === 'epic' || tier === 'mythic' || tier === 'outfit') &&
                highTierShowcase.length > 0
              ? highTierShowcase
              : COSMETIC_CATALOG.filter((c) => c.cost > 0 && !c.dropOnly);
        const showcase = fallbackPool[Math.floor(Math.random() * fallbackPool.length)];
        pickedItems.push(showcase);
        duplicateCount++;
      }
    }

    const duplicateRefund = duplicateCount * cfg.duplicateRefundPerSlot;
    const rarityRank: Record<string, number> = {
      mythic: 5,
      legendary: 4,
      epic: 3,
      rare: 2,
      common: 1,
    };
    pickedItems.sort((a, b) => (rarityRank[b.rarity] || 0) - (rarityRank[a.rarity] || 0));

    const note =
      tier === 'outfit'
        ? hitOutfitCount > 0
          ? `EFSANE ŞANS! ${hitOutfitCount} gizli kıyafet (???) kazandın!`
          : "Gizli kıyafet şansı bu tur tutmadı (En kolay 5.000'de 1) · Teselli ödülü verildi."
        : undefined;

    return {
      pickedItems,
      newlyUnlockedIds,
      duplicateCount,
      duplicateRefund,
      note,
    };
  };

  const handleOpenMarketCrate = (tier: CrateTier): CrateSpinPayload | null => {
    const cost = CRATE_TIER_CONFIGS[tier].unitCost;
    if (peanutBank < cost) return null;

    const { pickedItems, newlyUnlockedIds, duplicateCount, duplicateRefund, note } = rollCrateDrops(
      tier,
      1
    );
    setPeanutBank((prev) => prev - cost + duplicateRefund);
    if (newlyUnlockedIds.length > 0) {
      setUnlockedIds((prev) => Array.from(new Set([...prev, ...newlyUnlockedIds])));
    }

    return {
      items: pickedItems,
      isDuplicateBonus: duplicateCount > 0,
      duplicateRefund,
      openedCount: 1,
      note,
    };
  };

  const handleBuyCrates = (tier: CrateTier, quantity: number): boolean => {
    const cleanQty = Math.max(1, Math.min(100, Math.floor(quantity) || 1));
    const totalCost = CRATE_TIER_CONFIGS[tier].unitCost * cleanQty;
    if (peanutBank < totalCost) return false;
    if ((crateInventory[tier] || 0) + cleanQty > 9999) return false;

    setPeanutBank((prev) => prev - totalCost);
    setCrateInventory((prev) => ({
      ...prev,
      [tier]: Math.min(9999, (prev[tier] || 0) + cleanQty),
    }));
    soundEngine.playCrateUnlock();
    return true;
  };

  const handleOpenCratesFromInventory = (
    tier: CrateTier,
    quantity: number
  ): CrateSpinPayload | null => {
    const owned = crateInventory[tier] || 0;
    const maxBatch = tier === 'mythic' ? 10 : 20;
    const openQty = Math.min(owned, maxBatch, Math.max(1, Math.floor(quantity) || 1));
    if (openQty <= 0) return null;

    const { pickedItems, newlyUnlockedIds, duplicateCount, duplicateRefund, note } = rollCrateDrops(
      tier,
      openQty
    );

    setCrateInventory((prev) => ({
      ...prev,
      [tier]: Math.max(0, (prev[tier] || 0) - openQty),
    }));
    if (duplicateRefund > 0) {
      setPeanutBank((prev) => prev + duplicateRefund);
    }
    if (newlyUnlockedIds.length > 0) {
      setUnlockedIds((prev) => Array.from(new Set([...prev, ...newlyUnlockedIds])));
    }

    return {
      items: pickedItems,
      isDuplicateBonus: duplicateCount > 0,
      duplicateRefund,
      openedCount: openQty,
      note,
    };
  };

  const handleUpgradeMagnet = () => {
    const cost = (upgrades.magnetLevel + 1) * 12;
    if (upgrades.magnetLevel >= 5 || peanutBank < cost) return;
    setPeanutBank((prev) => prev - cost);
    setUpgrades((prev) => ({ ...prev, magnetLevel: prev.magnetLevel + 1 }));
    soundEngine.playCrateUnlock();
  };

  const handleUpgradeDoublePeanut = () => {
    const cost = (upgrades.doublePeanutLevel + 1) * 14;
    if (upgrades.doublePeanutLevel >= 5 || peanutBank < cost) return;
    setPeanutBank((prev) => prev - cost);
    setUpgrades((prev) => ({ ...prev, doublePeanutLevel: prev.doublePeanutLevel + 1 }));
    soundEngine.playCrateUnlock();
  };

  const handleBuyShield = (amount: number, cost: number) => {
    if (peanutBank < cost || upgrades.shieldCount + amount > 99) return;
    setPeanutBank((prev) => prev - cost);
    setUpgrades((prev) => ({ ...prev, shieldCount: prev.shieldCount + amount }));
    soundEngine.playCrateUnlock();
  };

  const handleSellCosmetic = (item: CosmeticItem) => {
    if (item.cost <= 0 || item.dropOnly || !unlockedIds.includes(item.id)) return;
    const gain = getCosmeticSellPrice(item);
    if (gain <= 0) return;

    setUnlockedIds((prev) => prev.filter((id) => id !== item.id));
    setPeanutBank((prev) => prev + gain);
    setEquipped((prev) => {
      if (prev[item.category] !== item.id) return prev;
      return {
        ...prev,
        [item.category]: DEFAULT_COSMETIC_BY_CATEGORY[item.category],
      };
    });
    soundEngine.playPeanut();
  };

  const handleSellBulkCosmetics = (items: CosmeticItem[]) => {
    const unlockedSet = new Set(unlockedIds);
    const sellIds = new Set<string>();
    let totalGain = 0;

    for (const item of items) {
      if (item.cost > 0 && !item.dropOnly && unlockedSet.has(item.id) && !sellIds.has(item.id)) {
        sellIds.add(item.id);
        totalGain += getCosmeticSellPrice(item);
      }
    }

    if (sellIds.size === 0 || totalGain <= 0) return;

    setUnlockedIds((prev) => prev.filter((id) => !sellIds.has(id)));
    setPeanutBank((prev) => prev + totalGain);
    setEquipped((prev) => {
      const next = { ...prev };
      (['hat', 'glasses', 'skin', 'trail'] as const).forEach((cat) => {
        if (sellIds.has(next[cat])) {
          next[cat] = DEFAULT_COSMETIC_BY_CATEGORY[cat];
        }
      });
      return next;
    });
    soundEngine.playCrateUnlock();
  };

  const handleSaveCharacterPreset = useCallback(
    (name: string) => {
      setSavedCharacters((prev) => {
        if (prev.length >= 12) return prev;
        const newPreset: SavedCharacterPreset = {
          id: `char_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
          name: name.trim().slice(0, 24) || `Kombin #${prev.length + 1}`,
          bodyType: bodyTypeRef.current,
          equipped: { ...equippedRef.current },
          nameColorId: equippedNameColorRef.current,
          savedAtMs: Date.now(),
        };
        return [newPreset, ...prev].slice(0, 12);
      });
      soundEngine.playCrateUnlock();
    },
    []
  );

  const handleOverwriteCharacterPreset = useCallback((presetId: string) => {
    setSavedCharacters((prev) =>
      prev.map((p) =>
        p.id === presetId
          ? {
              ...p,
              bodyType: bodyTypeRef.current,
              equipped: { ...equippedRef.current },
              nameColorId: equippedNameColorRef.current,
              savedAtMs: Date.now(),
            }
          : p
      )
    );
    soundEngine.playCrateUnlock();
  }, []);

  const handleLoadCharacterPreset = useCallback(
    (preset: SavedCharacterPreset) => {
      const unlockedSet = new Set(unlockedIdsRef.current);
      const nameColorSet = new Set(unlockedNameColorsRef.current);
      const nextEquipped: EquippedCosmetics = {
        hat: unlockedSet.has(preset.equipped.hat)
          ? preset.equipped.hat
          : DEFAULT_COSMETIC_BY_CATEGORY.hat,
        glasses: unlockedSet.has(preset.equipped.glasses)
          ? preset.equipped.glasses
          : DEFAULT_COSMETIC_BY_CATEGORY.glasses,
        skin: unlockedSet.has(preset.equipped.skin)
          ? preset.equipped.skin
          : DEFAULT_COSMETIC_BY_CATEGORY.skin,
        trail: unlockedSet.has(preset.equipped.trail)
          ? preset.equipped.trail
          : DEFAULT_COSMETIC_BY_CATEGORY.trail,
        suit:
          preset.equipped.suit && unlockedSet.has(preset.equipped.suit)
            ? preset.equipped.suit
            : DEFAULT_COSMETIC_BY_CATEGORY.suit,
      };
      setBodyType(preset.bodyType);
      setEquipped(nextEquipped);
      if (nameColorSet.has(preset.nameColorId)) {
        setEquippedNameColor(preset.nameColorId);
      }
      soundEngine.playPeanut();
      showBanner(`Kombin giyildi: ${preset.name}`, 2000);
    },
    [showBanner]
  );

  const handleDeleteCharacterPreset = useCallback((presetId: string) => {
    setSavedCharacters((prev) => prev.filter((p) => p.id !== presetId));
    soundEngine.playScore();
  }, []);

  // Track native browser fullscreen state
  useEffect(() => {
    const onFullscreenChange = () => {
      const active = Boolean(document.fullscreenElement);
      setIsNativeFullscreen(active);
      if (active) {
        setIsTheaterFullscreen(false);
      }
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  useEffect(() => {
    const anyModalOpen =
      isShopOpen ||
      isSellOpen ||
      isDailyQuestsOpen ||
      isLeaderboardOpen ||
      isAvatarOpen ||
      isSavedCharsOpen ||
      isCreatorPanelOpen ||
      isAuthModalOpen ||
      Boolean(rareExplosionItem);
    if (anyModalOpen && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  }, [
    isAuthModalOpen,
    isAvatarOpen,
    isCreatorPanelOpen,
    isDailyQuestsOpen,
    isLeaderboardOpen,
    isSavedCharsOpen,
    isSellOpen,
    isShopOpen,
    rareExplosionItem,
  ]);

  const toggleFullscreen = useCallback(async () => {
    const target = stageContainerRef.current;
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {
        setIsNativeFullscreen(false);
      }
      setIsTheaterFullscreen(false);
      return;
    }
    if (isTheaterFullscreen) {
      setIsTheaterFullscreen(false);
      return;
    }
    if (target && typeof target.requestFullscreen === 'function') {
      try {
        await target.requestFullscreen();
        return;
      } catch {
        // Iframe may block native Fullscreen API; fall back seamlessly to CSS Theater Fullscreen
      }
    }
    setIsTheaterFullscreen(true);
  }, [isTheaterFullscreen]);

  // Keyboard controls
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        isShopOpen ||
        isSellOpen ||
        isDailyQuestsOpen ||
        isLeaderboardOpen ||
        isAvatarOpen ||
        isSavedCharsOpen ||
        isCreatorPanelOpen ||
        isAuthModalOpen
      ) {
        if (e.code === 'Escape') {
          setIsShopOpen(false);
          setIsSellOpen(false);
          setIsDailyQuestsOpen(false);
          setIsLeaderboardOpen(false);
          setIsAvatarOpen(false);
          setIsSavedCharsOpen(false);
          setIsCreatorPanelOpen(false);
          setIsAuthModalOpen(false);
        }
        return;
      }
      if (e.code === 'Escape' && isTheaterFullscreen) {
        e.preventDefault();
        setIsTheaterFullscreen(false);
        return;
      }
      if (e.code === 'KeyF' && !e.repeat) {
        e.preventDefault();
        toggleFullscreen();
        return;
      }
      if (e.repeat) return;

      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        const state = gameStateRef.current;
        if (state === 'PLAYING') {
          flap();
        } else if (state === 'TITLE_MENU') {
          startGame();
        } else if (state === 'GAME_OVER') {
          if (performance.now() - gameOverTimestampRef.current > 420) {
            startGame();
          }
        } else if (state === 'PAUSED') {
          togglePause();
        }
      } else if (e.code === 'KeyP' || e.code === 'Escape') {
        if (gameStateRef.current === 'PLAYING' || gameStateRef.current === 'PAUSED') {
          e.preventDefault();
          togglePause();
        }
      } else if (e.code === 'KeyM') {
        toggleMute();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    flap,
    isAuthModalOpen,
    isAvatarOpen,
    isCreatorPanelOpen,
    isDailyQuestsOpen,
    isLeaderboardOpen,
    isSavedCharsOpen,
    isSellOpen,
    isShopOpen,
    isTheaterFullscreen,
    startGame,
    toggleFullscreen,
    toggleMute,
    togglePause,
  ]);

  // Main 60fps Canvas Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let lastTime = performance.now();

    const spawnPipeAndRewards = () => {
      const cfg = DIFFICULTY_CONFIGS[difficultyRef.current];
      const playableHeight = WORLD_HEIGHT - GROUND_HEIGHT;
      const minGapTop = 64;
      const maxGapTop = playableHeight - cfg.gap - 64;

      const lastPipe = pipesRef.current[pipesRef.current.length - 1];
      let gapTop: number;
      if (lastPipe) {
        const maxDelta = difficultyRef.current === 'turbo' ? 165 : 135;
        const lowBound = Math.max(minGapTop, lastPipe.gapTop - maxDelta);
        const highBound = Math.min(maxGapTop, lastPipe.gapTop + maxDelta);
        gapTop = lowBound + Math.random() * (highBound - lowBound);
      } else {
        const mid = (minGapTop + maxGapTop) * 0.5;
        gapTop = mid + (Math.random() - 0.5) * 90;
      }

      const pipeWidth = 68;
      const pipeX = WORLD_WIDTH + 40;
      pipeSpawnCountRef.current += 1;

      pipesRef.current.push({
        id: nextEntityIdRef.current++,
        x: pipeX,
        gapTop,
        gapHeight: cfg.gap,
        width: pipeWidth,
        passed: false,
      });

      if (pipeSpawnCountRef.current % 4 === 0) {
        const crateX = pipeX + pipeWidth / 2;
        const crateY = gapTop + cfg.gap * (0.35 + Math.random() * 0.3);
        cratesRef.current.push({
          id: nextEntityIdRef.current++,
          x: crateX,
          y: crateY,
          size: 26,
          collected: false,
          bobPhase: Math.random() * Math.PI * 2,
        });
      } else if (Math.random() < 0.55) {
        const insideGap = Math.random() < 0.65;
        const px = insideGap ? pipeX + pipeWidth / 2 : pipeX + pipeWidth + 95;
        const py = insideGap
          ? gapTop + cfg.gap * (0.3 + Math.random() * 0.4)
          : 90 + Math.random() * (playableHeight - 180);

        peanutsRef.current.push({
          id: nextEntityIdRef.current++,
          x: px,
          y: py,
          radius: 13,
          collected: false,
          bobPhase: Math.random() * Math.PI * 2,
        });
      }
    };

    const tick = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      const dt = Math.min(rawDt, 0.05);
      lastTime = now;

      const state = gameStateRef.current;
      const cfg = DIFFICULTY_CONFIGS[difficultyRef.current];
      const bodyCfg = BODY_TYPE_CONFIGS[bodyTypeRef.current];
      const playableHeight = WORLD_HEIGHT - GROUND_HEIGHT;

      if (state !== 'PAUSED') {
        timeRef.current += dt;
      }

      if (flashAlphaRef.current > 0) {
        flashAlphaRef.current = Math.max(0, flashAlphaRef.current - dt * 2.8);
      }

      if (state === 'TITLE_MENU' || state === 'PLAYING') {
        for (const c of cloudsRef.current) {
          c.x -= c.speed * dt;
          if (c.x < -120) {
            c.x = WORLD_WIDTH + 100;
            c.y = 55 + Math.random() * 115;
          }
        }
      }

      const el = elephantRef.current;

      el.blinkTimer -= dt;
      if (el.blinkTimer < -0.1) {
        el.blinkTimer = 2.2 + Math.random() * 2.8;
      }

      if (state === 'TITLE_MENU') {
        groundOffsetRef.current += 105 * dt;
        bgOffsetRef.current += 45 * dt;
        const targetX =
          isShopOpenRef.current || isSellOpenRef.current ? WORLD_WIDTH * 0.44 : 175;
        el.x += (targetX - el.x) * Math.min(1, dt * 8);
        el.y = playableHeight * 0.45 + Math.sin(timeRef.current * 3.2) * 11;
        el.earPhase += dt * 6;
        el.rotation = Math.sin(timeRef.current * 3.2) * 0.06;
        el.scarfWave += dt * 2;
        if (equippedRef.current.trail !== 'trail_none') {
          trailTickRef.current += dt;
          if (trailTickRef.current >= 0.08) {
            trailTickRef.current = 0;
            spawnTrailParticles(el.x, el.y, 1, false);
          }
        }
      } else if (state === 'PLAYING') {
        const speedMult = isUserCreator(userRef.current) ? speedMultiplierRef.current : 1;
        const activeSpeed = cfg.speed * speedMult;

        groundOffsetRef.current += activeSpeed * dt;
        bgOffsetRef.current += activeSpeed * 0.45 * dt;

        if (el.invincibleTimer > 0) {
          el.invincibleTimer = Math.max(0, el.invincibleTimer - dt);
        }

        // Ambient trail emission for equipped custom trails
        if (equippedRef.current.trail !== 'trail_none') {
          trailTickRef.current += dt;
          if (trailTickRef.current >= 0.06) {
            trailTickRef.current = 0;
            spawnTrailParticles(el.x, el.y, 1, false);
          }
        }

        el.vy = Math.min(520, el.vy + cfg.gravity * bodyCfg.gravityMult * dt);
        el.y += el.vy * dt;
        el.earPhase += dt * 7;
        el.scarfWave += dt * 2.5;
        if (el.earFlapTimer > 0) {
          el.earFlapTimer = Math.max(0, el.earFlapTimer - dt);
        }

        const targetRot =
          el.vy < 0
            ? Math.max(-0.42, (el.vy / Math.abs(cfg.flapVelocity)) * 0.42)
            : Math.min(1.15, (el.vy / 650) * 1.15);
        el.rotation += (targetRot - el.rotation) * Math.min(1, dt * 12);

        const visualRadius = ELEPHANT_RADIUS * bodyCfg.scaleY;

        if (el.y - visualRadius < 0) {
          el.y = visualRadius;
          if (el.vy < 0) el.vy = 0;
        }

        // Ground collision
        const isGodActive = isUserCreator(userRef.current) && godModeRef.current;
        if (el.y + bodyCfg.hitboxRadius >= playableHeight) {
          if (isGodActive) {
            el.y = playableHeight - bodyCfg.hitboxRadius - 4;
            el.vy = cfg.flapVelocity * 0.85;
          } else if (hasActiveShieldRef.current) {
            // Shield saves from ground bump once
            hasActiveShieldRef.current = false;
            setHasActiveShield(false);
            setUpgrades((prev) => ({ ...prev, shieldCount: Math.max(0, prev.shieldCount - 1) }));
            el.invincibleTimer = 1.4;
            el.y = playableHeight - bodyCfg.hitboxRadius - 10;
            el.vy = cfg.flapVelocity * 1.05;
            flashAlphaRef.current = 0.4;
            spawnCrashParticles(el.x, el.y, true);
            showBanner('Kalkan Kurtardı!', 1800);
            soundEngine.playCrateUnlock();
          } else {
            el.y = playableHeight - bodyCfg.hitboxRadius;
            triggerGameOver();
          }
        }

        spawnTimerRef.current -= dt * speedMult;
        if (spawnTimerRef.current <= 0) {
          spawnPipeAndRewards();
          spawnTimerRef.current = cfg.spawnInterval;
        }

        const hitboxRadius = bodyCfg.hitboxRadius;
        for (const pipe of pipesRef.current) {
          pipe.x -= activeSpeed * dt;

          if (!pipe.passed && pipe.x + pipe.width < el.x) {
            pipe.passed = true;
            runPipesPassedRef.current += 1;
            const pipePoints = difficultyRef.current === 'turbo' ? 2 : 1;
            scoreRef.current += pipePoints;
            setScore(scoreRef.current);
            advanceDailyQuests('pipe');
            soundEngine.playScore();
          }

          if (el.invincibleTimer <= 0 && !isGodActive) {
            const closestX = Math.max(pipe.x, Math.min(el.x, pipe.x + pipe.width));
            const closestTopY = Math.max(0, Math.min(el.y, pipe.gapTop));
            const distTopSq = (el.x - closestX) ** 2 + (el.y - closestTopY) ** 2;

            const bottomY = pipe.gapTop + pipe.gapHeight;
            const closestBotY = Math.max(bottomY, Math.min(el.y, playableHeight));
            const distBotSq = (el.x - closestX) ** 2 + (el.y - closestBotY) ** 2;

            if (distTopSq < hitboxRadius ** 2 || distBotSq < hitboxRadius ** 2) {
              if (hasActiveShieldRef.current) {
                hasActiveShieldRef.current = false;
                setHasActiveShield(false);
                setUpgrades((prev) => ({
                  ...prev,
                  shieldCount: Math.max(0, prev.shieldCount - 1),
                }));
                el.invincibleTimer = 1.5;
                flashAlphaRef.current = 0.45;
                spawnCrashParticles(el.x, el.y, true);
                showBanner('Savan Kalkanı Kırıldı!', 2000);
                soundEngine.playCrateUnlock();
              } else {
                triggerGameOver();
                break;
              }
            }
          }
        }

        pipesRef.current = pipesRef.current.filter((p) => p.x + p.width > -40);

        // Magnet pull range
        const magnetLvl = upgradesRef.current.magnetLevel;
        const magnetRange = magnetLvl > 0 ? 65 + magnetLvl * 45 : 0;

        // Peanuts pickup
        for (const peanut of peanutsRef.current) {
          peanut.x -= activeSpeed * dt;
          if (!peanut.collected) {
            const dx = el.x - peanut.x;
            const dy = el.y - peanut.y;
            const dist = Math.hypot(dx, dy);

            if (magnetRange > 0 && dist < magnetRange && dist > 1) {
              const pullSpeed = 290 + magnetLvl * 50;
              peanut.x += (dx / dist) * pullSpeed * dt;
              peanut.y += (dy / dist) * pullSpeed * dt;
            }

            const collectDist = hitboxRadius + peanut.radius + 8;
            if (dist <= collectDist) {
              peanut.collected = true;
              const dblChance = upgradesRef.current.doublePeanutLevel * 0.2;
              const isDouble = Math.random() < dblChance;
              const peanutGain = isDouble ? 3 : 1;

              const peanutScoreBonus = difficultyRef.current === 'turbo' ? 5 : 3;
              runPeanutPickupsRef.current += 1;
              scoreRef.current += peanutScoreBonus;
              setScore(scoreRef.current);
              setPeanutsCollected((prev) => prev + peanutGain);
              setPeanutBank((prev) => prev + peanutGain);
              advanceDailyQuests('peanut');
              spawnPeanutParticles(peanut.x, peanut.y);
              floatingTextsRef.current.push({
                x: peanut.x,
                y: peanut.y - 12,
                text: isDouble
                  ? `+${peanutScoreBonus} Skor · +${peanutGain} Fıstık!`
                  : `+${peanutScoreBonus} Skor · +1 Fıstık`,
                color: '#FDE047',
                life: 0.78,
                maxLife: 0.78,
              });
              soundEngine.playPeanut();
            }
          }
        }
        peanutsRef.current = peanutsRef.current.filter((p) => !p.collected && p.x > -40);

        // Mystery Cosmetic Crates pickup
        for (const crate of cratesRef.current) {
          crate.x -= activeSpeed * dt;
          if (!crate.collected) {
            const dx = el.x - crate.x;
            const dy = el.y - crate.y;
            const dist = Math.hypot(dx, dy);

            if (magnetRange > 0 && dist < magnetRange && dist > 1) {
              const pullSpeed = 260 + magnetLvl * 45;
              crate.x += (dx / dist) * pullSpeed * dt;
              crate.y += (dy / dist) * pullSpeed * dt;
            }

            const collectDist = hitboxRadius + crate.size * 0.7 + 6;
            if (dist <= collectDist) {
              crate.collected = true;
              unlockAndEquipCrateDrop(crate.x, crate.y);
              advanceDailyQuests('crate');
            }
          }
        }
        cratesRef.current = cratesRef.current.filter((c) => !c.collected && c.x > -40);
      } else if (state === 'GAME_OVER') {
        if (el.y + bodyCfg.hitboxRadius < playableHeight) {
          el.vy += 1550 * dt;
          el.y = Math.min(playableHeight - bodyCfg.hitboxRadius, el.y + el.vy * dt);
          el.rotation = Math.min(1.4, el.rotation + dt * 5);
        }
      }

      if (state !== 'PAUSED') {
        for (const p of particlesRef.current) {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.life -= dt;
        }
        particlesRef.current = particlesRef.current.filter((p) => p.life > 0);

        for (const ft of floatingTextsRef.current) {
          ft.y -= 42 * dt;
          ft.life -= dt;
        }
        floatingTextsRef.current = floatingTextsRef.current.filter((ft) => ft.life > 0);
      }

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const targetW = WORLD_WIDTH * dpr;
      const targetH = WORLD_HEIGHT * dpr;
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      renderGameScene({
        ctx,
        elephant: el,
        bodyType: bodyTypeRef.current,
        equipped: equippedRef.current,
        hasShield: hasActiveShieldRef.current && state === 'PLAYING',
        pipes: pipesRef.current,
        peanuts: peanutsRef.current,
        crates: cratesRef.current,
        particles: particlesRef.current,
        floatingTexts: floatingTextsRef.current,
        clouds: cloudsRef.current,
        groundOffset: groundOffsetRef.current,
        bgOffset: bgOffsetRef.current,
        score: scoreRef.current,
        time: timeRef.current,
        flashAlpha: flashAlphaRef.current,
      });
      ctx.restore();

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [
    advanceDailyQuests,
    showBanner,
    spawnCrashParticles,
    spawnPeanutParticles,
    spawnTrailParticles,
    triggerGameOver,
    unlockAndEquipCrateDrop,
  ]);

  const currentBest = highScores[difficulty];
  const medal = getMedalInfo(score);
  const creatorActive = isUserCreator(user);
  const selfLeaderboardEntry = leaderboardEntries.find((e) => e.uid === user?.uid);
  const todaysQuests = useMemo(
    () => getDailyQuestsForDate(dailyQuestsState.dateKey),
    [dailyQuestsState.dateKey]
  );
  const questsDoneCount = todaysQuests.filter(
    (q) => (dailyQuestsState.progress[q.id] || 0) >= q.target
  ).length;
  const questsUnclaimedCount = todaysQuests.filter(
    (q) =>
      (dailyQuestsState.progress[q.id] || 0) >= q.target &&
      !dailyQuestsState.claimedIds.includes(q.id)
  ).length;

  if (banStatus.banned && !creatorActive) {
    return (
      <div className="w-full max-w-lg mx-auto my-12 bg-slate-900 border border-rose-500/60 rounded-2xl p-6 sm:p-8 text-center shadow-2xl">
        <div className="w-14 h-14 mx-auto rounded-full bg-rose-500/20 border border-rose-400/50 flex items-center justify-center text-rose-400">
          <Ban className="w-7 h-7" />
        </div>
        <h1 className="mt-4 text-2xl font-extrabold text-white">Erişimin Yasaklandı</h1>
        <p className="mt-2 text-sm text-rose-200">
          {banStatus.reason || 'Hesabın veya IP adresin oyunun yapımcısı tarafından engellendi.'}
        </p>
        {user && (
          <button
            type="button"
            onClick={() => signOutUser().catch(() => {})}
            className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Hesaptan Çıkış Yap</span>
          </button>
        )}
      </div>
    );
  }

  const isSidePanelOpen = isShopOpen || isSellOpen;
  const totalCrates = getTotalCrateCount(crateInventory);
  const currentBiome = getBiomeTheme(score);

  return (
    <div
      className={`w-full mx-auto flex flex-col gap-4 transition-all duration-300 ${
        isSidePanelOpen ? 'max-w-[1440px] sm:pr-[450px] lg:pr-[500px]' : 'max-w-[980px]'
      }`}
    >
      {/* Top Bar */}
      <header className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Uçan Fil
          </h1>
          <span className="text-xs sm:text-sm text-slate-400">
            {BODY_TYPE_CONFIGS[bodyType].label} · Rekor{' '}
            <span className="font-mono-num font-bold text-amber-400">{currentBest}</span> · Kasa{' '}
            <span className="font-mono-num font-bold text-yellow-300">{peanutBank} Fıstık</span>
          </span>
          {user && (
            <StyledPlayerName
              name={customDisplayName || user.displayName || 'Oyuncu'}
              colorId={equippedNameColor}
              className="text-xs sm:text-sm font-extrabold"
            />
          )}
          {user && creatorActive && (
            <span className="inline-flex items-center gap-1 text-xs font-extrabold text-amber-300 bg-amber-500/15 border border-amber-400/50 px-2 py-0.5 rounded">
              <Crown className="w-3.5 h-3.5" />
              Oyunun Yapımcısı
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {creatorActive && (
            <button
              type="button"
              onClick={() => setIsCreatorPanelOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/60 text-amber-200 text-xs sm:text-sm font-bold transition-colors cursor-pointer whitespace-nowrap"
            >
              <Crown className="w-4 h-4 text-amber-300" />
              <span>Yapımcı Menüsü</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              if (gameStateRef.current === 'GAME_OVER') {
                resetWorld();
                gameStateRef.current = 'TITLE_MENU';
                setGameState('TITLE_MENU');
              }
              setIsSellOpen(false);
              setShopInitialTab('market');
              setIsShopOpen((prev) => !prev);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Market ({unlockedIds.length}/{COSMETIC_CATALOG.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (gameStateRef.current === 'GAME_OVER') {
                resetWorld();
                gameStateRef.current = 'TITLE_MENU';
                setGameState('TITLE_MENU');
              }
              setIsSellOpen(false);
              setShopInitialTab('crateInventory');
              setIsShopOpen(true);
            }}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              totalCrates > 0
                ? 'bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/60 text-cyan-200'
                : 'bg-slate-800 hover:bg-slate-700 text-cyan-300'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Kutu Çantası ({totalCrates})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (gameStateRef.current === 'GAME_OVER') {
                resetWorld();
                gameStateRef.current = 'TITLE_MENU';
                setGameState('TITLE_MENU');
              }
              setIsShopOpen(false);
              setIsSellOpen((prev) => !prev);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap"
          >
            <Tag className="w-4 h-4" />
            <span>Satış Tezgahı</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const todayKey = getTodayDateKey();
              if (dailyQuestsState.dateKey !== todayKey) {
                setDailyQuestsState(createEmptyDailyQuestsState(todayKey));
              }
              setIsDailyQuestsOpen(true);
            }}
            className={`relative inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              questsUnclaimedCount > 0
                ? 'bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/60 text-emerald-200'
                : 'bg-slate-800 hover:bg-slate-700 text-emerald-300'
            }`}
          >
            <CalendarCheck2 className="w-4 h-4" />
            <span>Görevler ({questsDoneCount}/3)</span>
            {questsUnclaimedCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsLeaderboardOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap"
          >
            <Trophy className="w-4 h-4" />
            <span>Sıralama</span>
          </button>

          <button
            type="button"
            onClick={() => setIsSavedCharsOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap"
          >
            <Bookmark className="w-4 h-4" />
            <span>Karakterler ({savedCharacters.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAvatarOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap"
          >
            <ImageIcon className="w-4 h-4" />
            <span>PP PNG</span>
          </button>

          {(!user || user.isGuest) && (
            <button
              type="button"
              onClick={() => {
                setAuthModalMode(user?.isGuest ? 'register' : 'login');
                setIsAuthModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs sm:text-sm font-bold transition-colors cursor-pointer whitespace-nowrap"
            >
              <LogIn className="w-4 h-4" />
              <span className="hidden sm:inline">
                {user?.isGuest ? 'Hesap Bağla' : 'Giriş Yap'}
              </span>
            </button>
          )}
          {user && !user.isGuest && (
            <button
              type="button"
              onClick={() => signOutUser().catch(() => {})}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap"
              title="Hesaptan çıkış yap"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}

          {(gameState === 'PLAYING' || gameState === 'PAUSED') && (
            <button
              type="button"
              onClick={togglePause}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs sm:text-sm font-medium transition-colors cursor-pointer whitespace-nowrap"
              aria-label={gameState === 'PAUSED' ? 'Oyuna devam et' : 'Oyunu duraklat'}
            >
              {gameState === 'PAUSED' ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            </button>
          )}

          <button
            type="button"
            onClick={toggleFullscreen}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              isFullscreen
                ? 'bg-sky-500 text-slate-950'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-100'
            }`}
            title="Tam Ekran (F)"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            <span className="hidden sm:inline">{isFullscreen ? 'Küçült' : 'Tam Ekran'}</span>
          </button>

          <button
            type="button"
            onClick={toggleMute}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs sm:text-sm font-medium transition-colors cursor-pointer whitespace-nowrap"
            aria-label={isMuted ? 'Sesi aç' : 'Sesi kapat'}
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4 text-rose-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            )}
          </button>
        </div>
      </header>

      {/* Main Game Stage */}
      <div
        ref={stageContainerRef}
        className={
          isTheaterFullscreen
            ? 'fixed inset-0 z-40 bg-slate-950 flex items-center justify-center p-2 sm:p-4 select-none'
            : isNativeFullscreen
              ? 'w-screen h-screen bg-slate-950 flex items-center justify-center p-2 sm:p-4 select-none'
              : 'w-full select-none'
        }
      >
        <div
          className={`relative aspect-[860/540] overflow-hidden shadow-2xl border border-slate-700/70 bg-slate-900 ${
            isFullscreen
              ? 'w-full max-w-[min(100vw,calc((100vh-1rem)*860/540))] max-h-full rounded-xl'
              : 'w-full rounded-2xl'
          }`}
        >
          <canvas
            ref={canvasRef}
            onPointerDown={handleCanvasAction}
            className="w-full h-full block cursor-pointer touch-none"
          />

          {/* Top-right Stage Controls (Biome Badge + Mute + Fullscreen in stage) */}
          <div
            onPointerDown={(e) => e.stopPropagation()}
            className="absolute top-3 right-3 z-20 flex items-center gap-1.5"
          >
            {(gameState === 'PLAYING' || gameState === 'PAUSED') && (
              <div className="pointer-events-none inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900/75 border border-slate-700/80 text-[11px] font-bold text-slate-100 backdrop-blur-xs">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: currentBiome.badgeColor }}
                />
                <span>{currentBiome.name}</span>
              </div>
            )}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-2 rounded-lg bg-slate-900/75 hover:bg-slate-800 border border-slate-700/80 text-slate-100 transition-colors cursor-pointer backdrop-blur-xs"
              title={isFullscreen ? 'Tam ekrandan çık (F)' : 'Tam ekran (F)'}
              aria-label={isFullscreen ? 'Tam ekrandan çık' : 'Tam ekran'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>

          {/* Active Shield Indicator during Play */}
          {gameState === 'PLAYING' && hasActiveShield && (
            <div className="pointer-events-none absolute top-4 left-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-sky-400/50 text-xs font-bold text-sky-300">
              <Shield className="w-3.5 h-3.5" />
              <span>Kalkan Aktif</span>
            </div>
          )}

          {/* Live Score HUD */}
          {(gameState === 'PLAYING' || gameState === 'PAUSED') && (
            <div className="pointer-events-none absolute top-4 left-0 right-0 flex flex-col items-center">
              <div
                className="font-mono-num text-5xl sm:text-6xl font-extrabold text-white tracking-tight"
                style={{
                  textShadow: '0 4px 0 #0F172A, 0 0 20px rgba(15, 23, 42, 0.45)',
                  WebkitTextStroke: '2px #0F172A',
                }}
              >
                {score}
              </div>
              {dropBanner && (
                <div className="mt-2 px-4 py-1.5 rounded-lg bg-purple-950/90 border border-purple-400/60 text-xs sm:text-sm font-bold text-purple-100 shadow-lg">
                  {dropBanner}
                </div>
              )}
            </div>
          )}

        {/* TITLE MENU OVERLAY */}
        {gameState === 'TITLE_MENU' && !isShopOpen && !isSellOpen && (
          <div className="absolute inset-0 bg-slate-950/30 flex items-center justify-center sm:justify-end p-3 sm:p-6">
            <div className="w-full max-w-[420px] bg-slate-900/95 border border-slate-700/80 rounded-2xl p-5 sm:p-6 shadow-2xl flex flex-col gap-4">
              <div>
                <h2 className="text-2xl font-extrabold text-white tracking-tight">
                  Uçuşa Hazırlan
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  Sol taraftaki filin yapısını ve kozmetiklerini canlı gör.
                </p>
              </div>

              {/* Body Type Selector */}
              <div>
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                  <span>Fil Yapısı</span>
                  <span className="text-slate-200 font-medium">
                    {BODY_TYPE_CONFIGS[bodyType].subtitle}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-800 rounded-xl">
                  {(['slim', 'normal', 'chubby'] as BodyType[]).map((bt) => {
                    const cfg = BODY_TYPE_CONFIGS[bt];
                    const active = bodyType === bt;
                    return (
                      <button
                        key={bt}
                        type="button"
                        onClick={() => setBodyType(bt)}
                        className={`py-2 px-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
                          active
                            ? 'bg-sky-400 text-slate-950 shadow-sm'
                            : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                        }`}
                      >
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Difficulty Selector */}
              <div>
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                  <span>Zorluk</span>
                  <span className="text-slate-200 font-medium">
                    {DIFFICULTY_CONFIGS[difficulty].description}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-800 rounded-xl">
                  {(['easy', 'classic', 'turbo'] as Difficulty[]).map((diffKey) => {
                    const cfg = DIFFICULTY_CONFIGS[diffKey];
                    const active = difficulty === diffKey;
                    return (
                      <button
                        key={diffKey}
                        type="button"
                        onClick={() => setDifficulty(diffKey)}
                        className={`py-2 px-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
                          active
                            ? 'bg-amber-400 text-slate-950 shadow-sm'
                            : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                        }`}
                      >
                        {cfg.label}
                        {diffKey === 'turbo' && (
                          <span
                            className={`ml-1 text-[10px] font-extrabold ${
                              active ? 'text-rose-700' : 'text-amber-300'
                            }`}
                          >
                            2x
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={startGame}
                  className="w-full py-3.5 px-6 rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-[0.99] text-slate-950 font-display font-extrabold text-lg transition-all cursor-pointer shadow-lg shadow-amber-500/20"
                >
                  Uçuşa Başla
                </button>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShopInitialTab('market');
                      setIsShopOpen(true);
                    }}
                    className="inline-flex items-center justify-center gap-1.5 py-2.5 px-2.5 rounded-xl bg-purple-600/90 hover:bg-purple-500 text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <ShoppingBag className="w-4 h-4 shrink-0" />
                    <span>Market</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsSavedCharsOpen(true)}
                    className="inline-flex items-center justify-center gap-1.5 py-2.5 px-2.5 rounded-xl bg-indigo-600/80 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Bookmark className="w-4 h-4 shrink-0" />
                    <span>Karakterler</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsLeaderboardOpen(true)}
                    className="inline-flex items-center justify-center gap-1.5 py-2.5 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Trophy className="w-4 h-4 shrink-0" />
                    <span>Sıralama</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PAUSED OVERLAY */}
        {gameState === 'PAUSED' && (
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[3px] flex items-center justify-center p-4">
            <div className="w-full max-w-xs bg-slate-900 border border-slate-700 rounded-2xl p-6 text-center shadow-2xl">
              <h2 className="text-2xl font-extrabold text-white">Oyun Duraklatıldı</h2>
              <p className="mt-1.5 text-sm text-slate-400">
                Fil havada nefes alıyor.
              </p>
              <div className="mt-5 flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={togglePause}
                  className="w-full py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm transition-colors cursor-pointer"
                >
                  Devam Et
                </button>
                <button
                  type="button"
                  onClick={startGame}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm transition-colors cursor-pointer"
                >
                  Baştan Başla
                </button>
                <button
                  type="button"
                  onClick={() => {
                    resetWorld();
                    gameStateRef.current = 'TITLE_MENU';
                    setGameState('TITLE_MENU');
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-800/60 hover:bg-slate-700 text-slate-300 font-semibold text-sm transition-colors cursor-pointer"
                >
                  Ana Menü
                </button>
              </div>
            </div>
          </div>
        )}

        {/* GAME OVER OVERLAY */}
        {gameState === 'GAME_OVER' && (
          <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-[2px] flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-slate-900/95 border border-slate-700/80 rounded-2xl p-6 shadow-2xl text-center">
              <div className="text-xs font-semibold tracking-wide text-rose-400">
                Uçuş Bitti
              </div>
              <h2 className="mt-1 text-3xl font-extrabold text-white">
                {isNewRecord ? 'Yeni Rekor!' : 'İyi Deneme!'}
              </h2>

              {medal && (
                <div
                  className={`mt-3 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg border text-xs font-bold ${medal.colorClass} ${medal.ringClass}`}
                >
                  <Trophy className="w-3.5 h-3.5" />
                  <span>{medal.label}</span>
                </div>
              )}

              {runDrops.length > 0 && (
                <div className="mt-3 text-xs text-purple-300 font-semibold">
                  Kutudan Çıkan: {runDrops.map((d) => d.name).join(', ')}
                </div>
              )}

              <div className="mt-4 grid grid-cols-3 gap-3 py-3.5 border-y border-slate-800">
                <div>
                  <div className="text-xs text-slate-400">Skor</div>
                  <div className="mt-0.5 font-mono-num text-2xl font-bold text-white">{score}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">En İyi</div>
                  <div className="mt-0.5 font-mono-num text-2xl font-bold text-amber-400">
                    {currentBest}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Fıstık</div>
                  <div className="mt-0.5 font-mono-num text-2xl font-bold text-yellow-300">
                    +{peanutsCollected}
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  onClick={startGame}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-display font-extrabold text-base transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Tekrar Oyna</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    resetWorld();
                    gameStateRef.current = 'TITLE_MENU';
                    setGameState('TITLE_MENU');
                  }}
                  className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm transition-colors cursor-pointer"
                >
                  Menü
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Footer Legend */}
      <footer className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-slate-400">
        <div>
          Space / Yukarı Ok / Tıkla ile kulak çırp · F tam ekran · P duraklat · M ses
        </div>
        <div>
          {upgrades.shieldCount > 0 && `Kalkan: ${upgrades.shieldCount} · `}
          {upgrades.magnetLevel > 0 && `Mıknatıs Sv.${upgrades.magnetLevel} · `}
          Skor arttıkça 7 farklı biyom açılır
        </div>
      </footer>

      {/* Modals */}
      <ShopModal
        isOpen={isShopOpen}
        initialTab={shopInitialTab}
        onClose={() => setIsShopOpen(false)}
        peanutBank={peanutBank}
        bodyType={bodyType}
        onChangeBodyType={setBodyType}
        unlockedIds={unlockedIds}
        equipped={equipped}
        unlockedNameColors={unlockedNameColors}
        equippedNameColor={equippedNameColor}
        previewPlayerName={customDisplayName || user?.displayName || 'Uçan Fil'}
        upgrades={upgrades}
        crateInventory={crateInventory}
        onSelectOrBuyCosmetic={handleSelectOrBuyCosmetic}
        onEquipCosmetic={handleEquipCosmetic}
        onSelectOrBuyNameColor={handleSelectOrBuyNameColor}
        onOpenCrate={handleOpenMarketCrate}
        onBuyCrates={handleBuyCrates}
        onOpenCratesFromInventory={handleOpenCratesFromInventory}
        onUpgradeMagnet={handleUpgradeMagnet}
        onUpgradeDoublePeanut={handleUpgradeDoublePeanut}
        onBuyShield={handleBuyShield}
        onUltraRareDrop={(item) => {
          setRareExplosionIsTest(false);
          setRareExplosionItem(item);
        }}
      />

      <CosmeticSellModal
        isOpen={isSellOpen}
        onClose={() => setIsSellOpen(false)}
        peanutBank={peanutBank}
        unlockedIds={unlockedIds}
        equipped={equipped}
        onSellCosmetic={handleSellCosmetic}
        onSellBulkCosmetics={handleSellBulkCosmetics}
      />

      <DailyQuestsModal
        isOpen={isDailyQuestsOpen}
        onClose={() => setIsDailyQuestsOpen(false)}
        quests={todaysQuests}
        questState={dailyQuestsState}
        onClaimReward={handleClaimQuestReward}
        onClaimAllRewards={handleClaimAllQuestRewards}
      />

      <AvatarExportModal
        isOpen={isAvatarOpen}
        onClose={() => setIsAvatarOpen(false)}
        bodyType={bodyType}
        equipped={equipped}
      />

      <SavedCharactersModal
        isOpen={isSavedCharsOpen}
        onClose={() => setIsSavedCharsOpen(false)}
        presets={savedCharacters}
        currentBodyType={bodyType}
        currentEquipped={equipped}
        currentNameColorId={equippedNameColor}
        previewPlayerName={customDisplayName || user?.displayName || 'Uçan Fil'}
        onSavePreset={handleSaveCharacterPreset}
        onLoadPreset={handleLoadCharacterPreset}
        onOverwritePreset={handleOverwriteCharacterPreset}
        onDeletePreset={handleDeleteCharacterPreset}
      />

      <LeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
        entries={leaderboardEntries}
        loading={leaderboardLoading}
        errorMsg={leaderboardError}
        user={user}
        isCreator={creatorActive}
        peanutBank={peanutBank}
        customDisplayName={customDisplayName}
        equippedNameColor={equippedNameColor}
        hasCustomName={
          selfLeaderboardEntry?.hasCustomName ?? selfLeaderboardMeta?.hasCustomName ?? false
        }
        lastNameChangeMs={
          selfLeaderboardEntry?.lastNameChangeMs ?? selfLeaderboardMeta?.lastNameChangeMs
        }
        onOpenNameColorShop={() => {
          setIsLeaderboardOpen(false);
          setIsSellOpen(false);
          setShopInitialTab('nameColors');
          setIsShopOpen(true);
        }}
        onSaveDisplayName={async (newName) => {
          if (!user || user.isGuest) {
            throw new Error('İsim değiştirmek için kayıtlı hesabına giriş yapmalısın.');
          }
          if (peanutBankRef.current < RENAME_PEANUT_COST) {
            throw new Error(`İsim değiştirmek için ${RENAME_PEANUT_COST} Fıstık gerekiyor.`);
          }
          const bestLocal = Math.max(
            highScoresRef.current.easy,
            highScoresRef.current.classic,
            highScoresRef.current.turbo
          );
          const res = await submitLeaderboardScore({
            user,
            score: bestLocal,
            difficulty: difficultyRef.current,
            bodyType: bodyTypeRef.current,
            equipped: equippedRef.current,
            nameColorId: equippedNameColorRef.current,
            customDisplayName: newName,
            forceWrite: true,
          });
          if (res.renamed) {
            setPeanutBank((prev) => Math.max(0, prev - RENAME_PEANUT_COST));
            soundEngine.playCrateUnlock();
          }
          setCustomDisplayName(res.displayName);
          customDisplayNameRef.current = res.displayName;
          setSelfLeaderboardMeta({
            displayName: res.displayName,
            hasCustomName: res.hasCustomName,
            lastNameChangeMs: res.lastNameChangeMs,
          });
        }}
        onSignIn={() => {
          setIsLeaderboardOpen(false);
          setAuthModalMode(user?.isGuest ? 'register' : 'login');
          setIsAuthModalOpen(true);
        }}
        onSignOut={() => signOutUser().catch(() => {})}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authModalMode}
      />

      {creatorActive && (
        <CreatorPanelModal
          isOpen={isCreatorPanelOpen}
          onClose={() => setIsCreatorPanelOpen(false)}
          godMode={godMode}
          onToggleGodMode={() => setGodMode((prev) => !prev)}
          speedMultiplier={speedMultiplier}
          onChangeSpeedMultiplier={(val) => setSpeedMultiplier(val)}
          onGrantAllItems={grantCreatorEverything}
          onGrantSecretTuxedo={grantSecretTuxedo}
          onGrantAllSuits={grantAllSuits}
          onGrantOutfitCrates={grantOutfitCrates}
          onTestRareDropAnimation={(suitId) => {
            const secretSuits = COSMETIC_CATALOG.filter((c) => c.category === 'suit');
            const picked =
              (suitId && COSMETIC_BY_ID[suitId]) ||
              secretSuits[Math.floor(Math.random() * secretSuits.length)] ||
              COSMETIC_BY_ID['suit_tuxedo'];
            if (picked) {
              setRareExplosionIsTest(true);
              setRareExplosionItem(picked);
            }
          }}
          onAddPeanuts={(amount) => setPeanutBank((prev) => prev + amount)}
          onSetCreatorLeaderboardScore={async (newScore) => {
            const cleanScore = Math.max(0, Math.min(999999, Math.floor(newScore)));
            const updatedScores = {
              ...highScoresRef.current,
              [difficultyRef.current]: cleanScore,
            };
            highScoresRef.current = updatedScores;
            setHighScores(updatedScores);
            saveHighScores(updatedScores);
            if (user && !user.isGuest) {
              await submitLeaderboardScore({
                user,
                score: cleanScore,
                difficulty: difficultyRef.current,
                bodyType: bodyTypeRef.current,
                equipped: equippedRef.current,
                nameColorId: equippedNameColorRef.current,
                forceWrite: true,
              });
            }
          }}
          leaderboardEntries={leaderboardEntries}
          onDeleteLeaderboardEntry={deleteLeaderboardEntry}
          bannedIps={bannedIps}
          bannedUids={bannedUids}
          onBanPlayer={(entry, reason) =>
            banPlayerByUidAndIp({
              targetUid: entry.uid,
              displayName: entry.displayName,
              reason,
            })
          }
          onBanIpManually={banIpManually}
          onUnbanIp={unbanIp}
          onUnbanUid={unbanUid}
        />
      )}

      <RareDropExplosionModal
        item={rareExplosionItem}
        bodyType={bodyType}
        equipped={equipped}
        isTestPreview={rareExplosionIsTest}
        onClose={() => {
          setRareExplosionItem(null);
          setRareExplosionIsTest(false);
        }}
        onEquipAndClose={(item) => {
          handleEquipCosmetic(item);
          setRareExplosionItem(null);
          setRareExplosionIsTest(false);
        }}
      />
    </div>
  );
}
