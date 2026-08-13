import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { track } from './analytics';

// Native replacement for the web app's Blob + synthetic <a download> click
// (doesn't work reliably in a WKWebView): write the .ics to the cache dir,
// then hand it to the native share sheet (Apple Calendar / Outlook / etc.
// all register as targets for .ics files).
export async function shareICS(ics: string, filename: string) {
  track('add_to_calendar', { method: 'ics_share', filename });
  const { uri } = await Filesystem.writeFile({
    path: filename,
    data: ics,
    directory: Directory.Cache,
    encoding: Encoding.UTF8,
  });
  await Share.share({ url: uri });
}
