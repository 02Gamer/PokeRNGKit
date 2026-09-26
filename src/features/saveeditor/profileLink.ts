import {
  DEFAULT_GEN3_PROFILE,
  GEN3_GAME_VERSIONS,
  type Gen3GameVersion,
} from "../profiles/domain";
import type { Gen3ProfilesController } from "../profiles/useGen3Profiles";
import {
  DEFAULT_GEN4_PROFILE,
  GEN4_GAME_VERSIONS,
} from "../gen4profiles/domain";
import type { Gen4GameVersion } from "../gen4static/domain";
import type { Gen4ProfilesController } from "../gen4profiles/useGen4Profiles";
import {
  DEFAULT_GEN5_PROFILE_DRAFT,
  GEN5_GAME_VERSIONS,
  type Gen5GameVersion,
} from "../gen5profiles/domain";
import type { Gen5ProfilesController } from "../gen5profiles/useGen5Profiles";
import {
  DEFAULT_GEN8_PROFILE_DRAFT,
  GEN8_GAME_VERSIONS,
  type Gen8GameVersion,
} from "../gen8profiles/domain";
import type { Gen8ProfilesController } from "../gen8profiles/useGen8Profiles";
import {
  DEFAULT_THREE_DS_PROFILE_DRAFT,
  THREE_DS_GAME_VERSIONS,
  type ThreeDsGameVersion,
} from "../3dsprofiles/domain";
import type { ThreeDsProfilesController } from "../3dsprofiles/useThreeDsProfiles";
import { saveGameChoices, type SaveReport } from "./domain";

export interface SaveProfileControllers {
  gen3: Gen3ProfilesController;
  gen4: Gen4ProfilesController;
  gen5: Gen5ProfilesController;
  gen8: Gen8ProfilesController;
  threeDs: ThreeDsProfilesController;
}

export function profileLink(
  report: SaveReport,
  version: string,
  controllers: SaveProfileControllers,
) {
  if (!report.checksumsValid || !saveGameChoices(report).includes(version))
    return undefined;
  const identity = { tid: report.tid, sid: report.sid };
  if (GEN3_GAME_VERSIONS.includes(version as Gen3GameVersion)) {
    return bind(
      controllers.gen3,
      version,
      {
        ...DEFAULT_GEN3_PROFILE,
        ...identity,
        version: version as Gen3GameVersion,
      },
      identity,
    );
  }
  if (GEN4_GAME_VERSIONS.includes(version as Gen4GameVersion)) {
    const patch = {
      ...identity,
      ...(report.nationalDex === null
        ? {}
        : { nationalDex: report.nationalDex }),
    };
    return bind(
      controllers.gen4,
      version,
      {
        ...DEFAULT_GEN4_PROFILE,
        ...patch,
        version: version as Gen4GameVersion,
      },
      patch,
    );
  }
  if (GEN5_GAME_VERSIONS.includes(version as Gen5GameVersion)) {
    return bind(
      controllers.gen5,
      version,
      {
        ...DEFAULT_GEN5_PROFILE_DRAFT,
        ...identity,
        version: version as Gen5GameVersion,
      },
      identity,
    );
  }
  if (THREE_DS_GAME_VERSIONS.includes(version as ThreeDsGameVersion)) {
    const patch = {
      tsv: (report.tid ^ report.sid) >>> 4,
      trv: (report.tid ^ report.sid) & 15,
    };
    return bind(
      controllers.threeDs,
      version,
      {
        ...DEFAULT_THREE_DS_PROFILE_DRAFT,
        ...patch,
        version: version as ThreeDsGameVersion,
      },
      patch,
    );
  }
  if (GEN8_GAME_VERSIONS.includes(version as Gen8GameVersion)) {
    return bind(
      controllers.gen8,
      version,
      {
        ...DEFAULT_GEN8_PROFILE_DRAFT,
        ...identity,
        version: version as Gen8GameVersion,
      },
      identity,
    );
  }
  return undefined;
}

function bind<
  D extends { name: string; version: string },
  P extends D & { id: string },
>(
  controller: {
    loading: boolean;
    profiles: P[];
    createProfile(draft: D): Promise<void>;
    updateProfile(original: P, draft: D): Promise<void>;
    selectProfile(id: string | null): Promise<void>;
  },
  version: string,
  defaults: D,
  patch: Partial<D>,
) {
  return {
    loading: controller.loading,
    profiles: controller.profiles.filter((p) => p.version === version),
    async save(id: string, name: string) {
      if (controller.loading) throw new Error("Profiles are still loading.");
      if (id === "new") {
        if (!name.trim()) throw new Error("Profile name is required.");
        await controller.createProfile({ ...defaults, name: name.trim() });
        return;
      }
      const original = controller.profiles.find(
        (p) => p.id === id && p.version === version,
      );
      if (!original) throw new Error("Select a matching profile.");
      // Updating an existing profile preserves seeds, hardware calibration and flags.
      await controller.updateProfile(original, { ...original, ...patch });
      await controller.selectProfile(original.id);
    },
  };
}
