import { IKContext, IKUpload } from 'imagekitio-react';

export const IMAGEKIT_PUBLIC_KEY = import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY;
export const IMAGEKIT_URL_ENDPOINT = import.meta.env.VITE_IMAGEKIT_URL_ENDPOINT;
export const IMAGEKIT_AUTH_ENDPOINT = '/api/imagekit/auth';

export const isImageKitConfigured = !!(IMAGEKIT_PUBLIC_KEY && IMAGEKIT_URL_ENDPOINT);
