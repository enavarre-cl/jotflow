/** Piper engine: pinned asset names, checksums, the curated voice catalog and URL builders.
 *  Pure constants/helpers (no I/O, no vscode) split out of manager.ts. */

// Release of the standalone Piper binary and asset name per platform/architecture.
export const PIPER_RELEASE = '2023.11.14-2';
export const PIPER_ASSET_SHA256: Record<string, string> = {
  'piper_macos_aarch64.tar.gz': '6b1eb03b3735946cb35216e063e7eebcc33a6bbf5dd96ec0217959bf1cdcb0cc',
  'piper_macos_x64.tar.gz': 'ced85c0a3df13945b1e623b878a48fdc2854d5c485b4b67f62857cf551deaf8b',
  'piper_linux_x86_64.tar.gz': 'a50cb45f355b7af1f6d758c1b360717877ba0a398cc8cbe6d2a7a3a26e225992',
  'piper_linux_aarch64.tar.gz': 'fea0fd2d87c54dbc7078d0f878289f404bd4d6eea6e7444a77835d1537ab88eb',
};
// Pinned version of piper-tts (PyPI). Bump it deliberately when reviewing releases.
export const PIPER_TTS_VERSION = '1.4.2';

// Self-contained Python (astral-sh/python-build-standalone). Pinned checksums.
export const PYTHON_STANDALONE_TAG = '20260610';
const PYTHON_STANDALONE_VERSION = '3.12.13';
export const PYTHON_STANDALONE_SHA256: Record<string, string> = {
  'cpython-3.12.13+20260610-aarch64-apple-darwin-install_only.tar.gz': 'e18ddd4c1e8f4a1d6c4590b37f423d76aec734447edc20ed08e93983d95f2132',
  'cpython-3.12.13+20260610-x86_64-apple-darwin-install_only.tar.gz': 'ba02164e4db381af8c288c0bc1657584a835e9121a0fa2836b0f2e712ff8cdf5',
  'cpython-3.12.13+20260610-x86_64-unknown-linux-gnu-install_only.tar.gz': 'c218f50baeb2c06a30c2f03db5986b2bad6ab7c8a52faad2d5a59bda0677b93a',
  'cpython-3.12.13+20260610-aarch64-unknown-linux-gnu-install_only.tar.gz': 'bc74cf1bb517651868342b0619b21eaaf9f94a2022c9c61886dd980e16fb091b',
  'cpython-3.12.13+20260610-x86_64-pc-windows-msvc-install_only.tar.gz': 'f5e4d9f856567493776f3d1e832c939fbaba5dcbcc5e0492a82ecfceea83b316',
};
export function pythonStandaloneAsset(platform: string, arch: string): string | null {
  const triples: Record<string, string> = {
    'darwin-arm64': 'aarch64-apple-darwin',
    'darwin-x64': 'x86_64-apple-darwin',
    'linux-x64': 'x86_64-unknown-linux-gnu',
    'linux-arm64': 'aarch64-unknown-linux-gnu',
    'win32-x64': 'x86_64-pc-windows-msvc',
  };
  const triple = triples[`${platform}-${arch}`];
  return triple ? `cpython-${PYTHON_STANDALONE_VERSION}+${PYTHON_STANDALONE_TAG}-${triple}-install_only.tar.gz` : null;
}
export function piperAsset(platform: string, arch: string): string | null {
  if (platform === 'darwin') return arch === 'arm64' ? 'piper_macos_aarch64.tar.gz' : 'piper_macos_x64.tar.gz';
  if (platform === 'linux') return arch === 'arm64' ? 'piper_linux_aarch64.tar.gz' : 'piper_linux_x86_64.tar.gz';
  if (platform === 'win32') return 'piper_windows_amd64.zip';
  return null;
}

// Pinned SHA256 of the .onnx for each curated voice (from huggingface.co/rhasspy/piper-voices via lfs.oid).
export const PIPER_VOICE_SHA256: Record<string, string> = {
  'es_MX-claude-high': '3ef40a71ea63852cd8ab7e6fa7d2ecdcfa67a0b47c9c48e3f10e02ee02083ea0',
  'es_AR-daniela-high': '7ceb1fc0dab349418c5b54a639ae9ee595212d7c9ea422220d8419163d5cc985',
  'es_ES-sharvard-medium': '40febfb1679c69a4505ff311dc136e121e3419a13a290ef264fdf43ddedd0fb1',
  'en_US-amy-medium': 'b3a6e47b57b8c7fbe6a0ce2518161a50f59a9cdd8a50835c02cb02bdd6206c18',
  'en_US-hfc_female-medium': '914c473788fc1fa8b63ace1cdcdb44588f4ae523d3ab37df1536616835a140b7',
  'en_GB-jenny_dioco-medium': '469c630d209e139dd392a66bf4abde4ab86390a0269c1e47b4e5d7ce81526b01',
  'pt_BR-faber-medium': '858555e3a064209c57088fe6bd70c4c3dc54d03eaa00c45d5ecaf43a33f95aa7',
  'fr_FR-siwis-medium': '641d1ab097da2b81128c076810edb052b385decc8be3381814802a64a73baf99',
  'de_DE-thorsten-medium': '7e64762d8e5118bb578f2eea6207e1a35a8e0c30595010b666f983fc87bb7819',
  'it_IT-paola-medium': '6fc918b5a0ea6137382833dddfa567bffbe6a5060c02043c87192ee59c04210c',
};
/** Catalog of curated voices available for download (id + label + language). The ids MUST
 *  match the keys in PIPER_VOICE_SHA256 (fail-closed) and media/main.js. */
export interface PiperVoiceInfo { id: string; label: string; lang: 'es' | 'en' | 'pt' | 'fr' | 'de' | 'it'; }
export const PIPER_VOICE_CATALOG: PiperVoiceInfo[] = [
  { id: 'es_MX-claude-high', label: 'Claude — Spanish 🇲🇽 (female)', lang: 'es' },
  { id: 'es_AR-daniela-high', label: 'Daniela — Spanish 🇦🇷 (female)', lang: 'es' },
  { id: 'es_ES-sharvard-medium', label: 'Sharvard — Spanish 🇪🇸', lang: 'es' },
  { id: 'en_US-amy-medium', label: 'Amy — English 🇺🇸 (female)', lang: 'en' },
  { id: 'en_US-hfc_female-medium', label: 'HFC — English 🇺🇸 (female)', lang: 'en' },
  { id: 'en_GB-jenny_dioco-medium', label: 'Jenny — English 🇬🇧 (female)', lang: 'en' },
  { id: 'pt_BR-faber-medium', label: 'Faber — Portuguese 🇧🇷 (male)', lang: 'pt' },
  { id: 'fr_FR-siwis-medium', label: 'Siwis — French 🇫🇷 (female)', lang: 'fr' },
  { id: 'de_DE-thorsten-medium', label: 'Thorsten — German 🇩🇪 (male)', lang: 'de' },
  { id: 'it_IT-paola-medium', label: 'Paola — Italian 🇮🇹 (female)', lang: 'it' },
];

/** HuggingFace URLs for a Piper voice given its id (lang_REGION-name-quality). */
export function piperVoiceUrls(id: string): { onnx: string; json: string } {
  const [region, name, quality] = id.split('-');
  const lang = region.split('_')[0];
  const base = `https://huggingface.co/rhasspy/piper-voices/resolve/main/${lang}/${region}/${name}/${quality}/${id}`;
  return { onnx: base + '.onnx', json: base + '.onnx.json' };
}

export type Notify = (msg: string) => void;
