import type { EventBus } from "gold-sight";

type Global = UserSettings & Features & {};

type UserSettings = {
  autoForce: boolean;
};

type Features = {
  isBrowser: boolean;
};

type EventContext = {
  event?: EventBus;
  eventUUID?: string;
};

const STYLE_RULE_TYPE = 1;
const MEDIA_RULE_TYPE = 4;
export { STYLE_RULE_TYPE, MEDIA_RULE_TYPE };
export type { Global, UserSettings, Features, EventContext };
