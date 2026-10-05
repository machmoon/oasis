// The Roseus spectrogram colour map, 256 RGB steps from near-black through indigo, magenta and orange to near-white.
// It is the default spectrogram colour scheme in Audacity ("Color (New)": src/spectrogram/internal/roseuscolormaps.h,
// copied into the gradient in src/spectrogram/internal/spectrogramcolors.cpp) and the 'roseus' option of the
// wavesurfer.js spectrogram plugin (src/spectrogram-setup.ts, colorMap: 'roseus'). Both take the table from
// github.com/dofuuz/roseus (roseus/cmap/roseus.py); this is that table, packed as hex, bytes r g b per step.
const HEX =
  "01010101020202020202030302030402040502050603060703070803080a03090c030a0e030c10030d11030e13020f15" +
  "02101702111902121b02131e01142001152201162401172601182800192b001a2d001b2f001b32001c34001d36001e39" +
  "001e3b011f3e01204001204302214503214804224a05234d06234f0823520924540b24560d25590f255b11255e132560" +
  "1526631726651926681b266a1d266c1f266f2126712326732626762826782a267a2c267c2e267e312680332682352584" +
  "3725863a25883c248a3e248b41248d43238f4523904823924a22934c22954f2196512197542098562099581f9a5b1f9b" +
  "5d1e9c5f1d9d621d9e641c9f671c9f691ba06b1ba06e1aa1701aa17219a17519a27718a27918a27c17a27e17a28017a2" +
  "8316a18516a18716a18916a18c16a08e16a090169f92169f94169e96169d99169d9b179c9d179b9f179aa11899a31898" +
  "a51997a71a96a91a95ab1b94ad1c93af1d92b11d91b31e90b51f8eb7208db8218cba228bbc2389be2488c02587c12785" +
  "c32884c52982c62a81c82b80ca2d7ecb2e7dcd2f7bce307ad03278d13377d33475d43674d63772d73971d93a6fda3c6e" +
  "db3d6ddd3f6bde406adf4268e14367e24565e34664e44863e54961e64b60e74d5ee94e5dea505ceb525bec5359ed5558" +
  "ed5757ee5956ef5a54f05c53f15e52f26051f26150f3634ff4654ef5674df5694cf66b4bf66c4af76e4af87049f87248" +
  "f87448f97647f97847fa7a46fa7c46fa7e46fb8046fb8245fb8446fb8646fb8846fc8a46fc8c46fc8e47fc9048fc9248" +
  "fc9449fc964afb984bfb9a4cfb9c4dfb9e4efba050fba251faa453faa655faa857f9aa58f9ac5af8ae5df8b05ff8b261" +
  "f7b463f7b666f6b868f6ba6bf5bc6ef4be70f4c073f3c276f3c379f2c57cf2c77ff1c983f0cb86f0cd89efcf8cefd090" +
  "eed293eed497edd59aedd79eecd9a1ecdaa5ecdca9ecdeacebdfb0ebe1b4ebe2b7ebe4bbebe5bfebe6c2ece8c6ece9c9" +
  "eceacdedecd0ededd4eeeed7efefdbf0f0def1f2e1f2f3e4f3f4e7f4f5eaf6f6edf7f7f0f9f8f2fbf9f5fdfaf7fefbf9";
/** 256 entries of [r, g, b]. */
export const ROSEUS = Array.from({ length: 256 }, (_, i) => [0, 1, 2].map((k) => parseInt(HEX.slice((i * 3 + k) * 2, (i * 3 + k) * 2 + 2), 16)));
/** A Uint8ClampedArray lookup, rgb triplets, for ImageData fills. */
export const ROSEUS_LUT = new Uint8ClampedArray(ROSEUS.flat());
