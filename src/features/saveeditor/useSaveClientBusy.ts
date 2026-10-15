// SPDX-License-Identifier: GPL-3.0-or-later
import { useSyncExternalStore } from "react";
import { getSaveRequestCount, subscribeSaveRequests } from "./clientActivity";
export const useSaveClientBusy = () =>
  useSyncExternalStore(subscribeSaveRequests, getSaveRequestCount, () => 0) > 0;
