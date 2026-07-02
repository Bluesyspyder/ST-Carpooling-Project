import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

/**
 * Prompts the user to take a photo or select from gallery.
 * Returns the base64 data URL representation of the image.
 */
export const takePhoto = async () => {
  try {
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.Base64,
      source: CameraSource.Prompt,
    });

    if (image.base64String) {
      return `data:image/${image.format || 'jpeg'};base64,${image.base64String}`;
    }
    return null;
  } catch (error) {
    console.error('[NativeCamera] Error capturing photo:', error);
    throw error;
  }
};

/**
 * Converts a base64 Data URL to a File object.
 */
export const dataUrlToFile = async (dataUrl, filename) => {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], filename, { type: blob.type });
};
