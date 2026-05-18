export type StartActionKind = "move" | "keep";

export interface StartTaskActionState {
	kind: StartActionKind;
}

export type StartTaskActionMap = Record<string, StartTaskActionState>;
