import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { RegisteredGroupWorkspace } from "./RegisteredGroupWorkspace";
import {
  registeredGroupWords,
  groupPosition,
  type RegisteredGroupAnalysis,
  type RegisteredGroupCatalog,
  type RegisteredGroupPosition,
} from "./registeredGroups";

export function RegisteredGroupViewer({
  revision,
  busy,
  onRead,
  onAnalyze,
}: {
  revision: number;
  busy: boolean;
  onRead(): Promise<RegisteredGroupCatalog | undefined>;
  onAnalyze(
    position: RegisteredGroupPosition,
  ): Promise<RegisteredGroupAnalysis | undefined>;
}) {
  const { i18n } = useTranslation();
  const lang = i18n.language.startsWith("zh")
    ? "zh"
    : i18n.language.startsWith("ja")
      ? "ja"
      : "en";
  const w = registeredGroupWords[lang];
  const [state, setState] = useState<{
    revision: number;
    catalog: RegisteredGroupCatalog;
    group: number;
    slot: number;
  }>();
  const [analysis, setAnalysis] = useState<RegisteredGroupAnalysis>();
  const reader = useRef(onRead);
  const request = useRef<
    | { revision: number; promise: Promise<RegisteredGroupCatalog | undefined> }
    | undefined
  >(undefined);
  const lifecycle = useRef({ alive: true, epoch: 0 }),
    flight = useRef(false);
  const [pending, setPending] = useState(false);
  useEffect(() => {
    reader.current = onRead;
  }, [onRead]);
  useEffect(() => {
    const life = lifecycle.current;
    life.alive = true;
    return () => {
      life.alive = false;
      life.epoch++;
    };
  }, []);
  useEffect(() => {
    const life = lifecycle.current;
    let active = true;
    if (request.current?.revision !== revision)
      request.current = { revision, promise: reader.current() };
    void request.current.promise.then((catalog) => {
      if (!active || !catalog) return;
      setState({ revision, catalog, group: catalog.initialGroup, slot: 0 });
      setAnalysis(undefined);
    });
    return () => {
      active = false;
      life.epoch++;
    };
  }, [revision]);
  const current = state?.revision === revision ? state : undefined;
  const locked = busy || pending;
  async function readAgain() {
    if (locked || flight.current) return;
    flight.current = true;
    setPending(true);
    const life = lifecycle.current,
      token = life.epoch;
    try {
      const catalog = await onRead();
      if (life.alive && token === life.epoch && catalog) {
        setState({ revision, catalog, group: catalog.initialGroup, slot: 0 });
        setAnalysis(undefined);
      }
    } finally {
      flight.current = false;
      if (life.alive) setPending(false);
    }
  }
  async function analyze(position: RegisteredGroupPosition) {
    if (locked || flight.current) return;
    flight.current = true;
    setPending(true);
    const life = lifecycle.current,
      token = life.epoch;
    try {
      const result = await onAnalyze(position);
      if (life.alive && token === life.epoch) setAnalysis(result);
    } finally {
      flight.current = false;
      if (life.alive) setPending(false);
    }
  }
  return current ? (
    <RegisteredGroupWorkspace
      catalog={current.catalog}
      group={current.group}
      slot={current.slot}
      lang={lang}
      busy={locked}
      analysis={analysis}
      onGroup={(group) => {
        if (locked || flight.current) return;
        groupPosition(current.catalog, group, 0);
        setState({ ...current, group, slot: 0 });
        setAnalysis(undefined);
      }}
      onSlot={(slot) => {
        if (locked || flight.current) return;
        groupPosition(current.catalog, current.group, slot);
        setState({ ...current, slot });
        setAnalysis(undefined);
      }}
      onAnalyze={analyze}
    />
  ) : (
    <div className="save-editor-toolbar">
      <button type="button" disabled={locked} onClick={() => void readAgain()}>
        {w.read}
      </button>
    </div>
  );
}
