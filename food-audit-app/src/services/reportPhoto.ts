import * as ImagePicker from 'expo-image-picker';

export type PickedPhoto = { status: 'ok'; photo: { uri: string; width: number; height: number } } | { status: 'cancelled' } | { status: 'denied' };

/** Съёмка на камеру или выбор из галереи для отчёта сообщества. */
export async function pickReportPhoto(source: 'camera' | 'gallery'): Promise<PickedPhoto> {
  if (source === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return { status: 'denied' };
  }
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 1, allowsEditing: false };
  const res = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  const asset = res.canceled ? undefined : res.assets?.[0];
  if (!asset) return { status: 'cancelled' };
  return { status: 'ok', photo: { uri: asset.uri, width: asset.width, height: asset.height } };
}
