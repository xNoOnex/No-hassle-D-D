const API_KEY_STORAGE = 'dnd_openrouter_api_key';
const MODEL_STORAGE = 'dnd_openrouter_model';
const DEFAULT_MODEL = 'nousresearch/hermes-3-llama-3.1-70b';

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
