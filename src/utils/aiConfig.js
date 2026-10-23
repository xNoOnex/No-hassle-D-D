const API_KEY_STORAGE = 'dnd_openrouter_api_key';
const MODEL_STORAGE = 'dnd_openrouter_model';
const DEFAULT_MODEL = 'nousresearch/hermes-3-llama-3.1-70b';

export const UNCENSORED_MODELS = [
  { id: 'nousresearch/hermes-3-llama-3.1-70b', name: 'Hermes 3 Llama 3.1 70B (Uncensored RP)' },
  { id: 'nousresearch/hermes-4-70b', name: 'Hermes 4 70B (Uncensored Storytelling)' },
  { id: 'nousresearch/hermes-4-405b', name: 'Hermes 4 405B (Flagship Uncensored)' },
  { id: 'cognitivecomputations/dolphin-mistral-24b-venice-edition:free', name: 'Dolphin Mistral 24B Venice (Free Uncensored)' },
  { id: 'nousresearch/deephermes-3-mistral-24b-preview', name: 'DeepHermes 3 Mistral 24B' },
  { id: 'anthracite-org/magnum-v4-72b', name: 'Magnum v4 72B (Dark Fantasy RP)' },
  { id: 'gryphe/mythomax-l2-13b', name: 'MythoMax L2 13B (Classic Fast D&D)' }
];

export function getApiKey() {
  return localStorage.getItem(API_KEY_STORAGE) || '';
}

export function setApiKey(key) {
  if (!key) {
    localStorage.removeItem(API_KEY_STORAGE);
  } else {
    localStorage.setItem(API_KEY_STORAGE, key.trim());
  }
}

export function getSelectedModel() {
  return localStorage.getItem(MODEL_STORAGE) || DEFAULT_MODEL;
}

export function setSelectedModel(model) {
  if (!model) {
    localStorage.setItem(MODEL_STORAGE, DEFAULT_MODEL);
  } else {
    localStorage.setItem(MODEL_STORAGE, model.trim());
  }
}
