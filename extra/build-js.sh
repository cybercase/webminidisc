#!/bin/bash -x

set -e -o pipefail

NPROC=$(grep -c ^processor /proc/cpuinfo)
ROOT_DIR=$PWD
BUILD_DIR=$ROOT_DIR/build

build_zlib() {
  cd third_party/zlib
  rm -rf build zconf.h
  mkdir build
  cd build
  emmake cmake .. \
    -DCMAKE_INSTALL_PREFIX=${BUILD_DIR}
  emmake make install -j${NPROC}
  cd ${ROOT_DIR}
}

build_x264() {
  cd third_party/x264
  emconfigure ./configure \
    --disable-asm \
    --disable-thread \
    --prefix=$BUILD_DIR
  emmake make install-lib-static -j${NPROC}
  cd ${ROOT_DIR}
}

configure_ffmpeg() {
  emconfigure ./configure \
    --nm="llvm-nm -g" \
    --ar=emar \
    --cc=emcc \
    --cxx=em++ \
    --objcc=emcc \
    --dep-cc=emcc \
    --prefix=$BUILD_DIR \
    --extra-cflags="-I$BUILD_DIR/include" \
    --extra-cxxflags="-I$BUILD_DIR/include" \
    --extra-ldflags="-L$BUILD_DIR/lib" \
    --enable-gpl \
    --disable-pthreads \
    --disable-doc \
    \
    --disable-stripping \
    \
    --disable-ffmpeg \
    --disable-ffprobe \
    --disable-ffplay \
    \
    --disable-indevs \
    --disable-outdevs \
    \
    --disable-x86asm \
    --disable-inline-asm \
  --disable-bsfs \
  --disable-parsers \
  --enable-parser=aac \
  --enable-parser=ac3 \
  --enable-parser=mpegaudio \
  --enable-parser=vorbis \
  --enable-parser=opus \
  --enable-parser=gsm \
  --enable-parser=flac \
  --enable-parser=dvaudio \
  \
  --disable-protocols \
  --enable-protocol=file \
  --enable-rdft \
  \
  --disable-demuxers \
  --enable-demuxer=ffmetadata \
  --enable-demuxer=aiff \
  --enable-demuxer=oma \
  --enable-demuxer=aac \
  --enable-demuxer=ac3 \
  --enable-demuxer=ape \
  --enable-demuxer=asf \
  --enable-demuxer=flac \
  --enable-demuxer=mp3 \
  --enable-demuxer=mpc \
  --enable-demuxer=mov \
  --enable-demuxer=mpc8 \
  --enable-demuxer=ogg \
  --enable-demuxer=tta \
  --enable-demuxer=wav \
  --enable-demuxer=wv \
  --enable-demuxer=pcm_alaw \
  --enable-demuxer=pcm_f32be \
  --enable-demuxer=pcm_f32le \
  --enable-demuxer=pcm_f64be \
  --enable-demuxer=pcm_f64le \
  --enable-demuxer=pcm_s16be \
  --enable-demuxer=pcm_s16le \
  --enable-demuxer=pcm_s24be \
  --enable-demuxer=pcm_s24le \
  --enable-demuxer=pcm_s32be \
  --enable-demuxer=pcm_s32le \
  --enable-demuxer=pcm_s8 \
  --enable-demuxer=pcm_u16be \
  --enable-demuxer=pcm_u16le \
  --enable-demuxer=pcm_u24be \
  --enable-demuxer=pcm_u24le \
  \
  --disable-muxers \
  --enable-muxer=ffmetadata \
  --enable-muxer=fifo \
  --enable-muxer=null \
  --enable-muxer=oma \
  --enable-muxer=rawvideo \
  --enable-muxer=wav \
  --enable-muxer=pcm_alaw \
  --enable-muxer=pcm_f32be \
  --enable-muxer=pcm_f32le \
  --enable-muxer=pcm_f64be \
  --enable-muxer=pcm_f64le \
  --enable-muxer=pcm_s16be \
  --enable-muxer=pcm_s16le \
  --enable-muxer=pcm_s24be \
  --enable-muxer=pcm_s24le \
  --enable-muxer=pcm_s32be \
  --enable-muxer=pcm_s32le \
  --enable-muxer=pcm_s8 \
  --enable-muxer=pcm_u16be \
  --enable-muxer=pcm_u16le \
  --enable-muxer=pcm_u24be \
  --enable-muxer=pcm_u24le \
  \
  --disable-decoders \
  --enable-decoder=opus \
  --enable-decoder=aac \
  --enable-decoder=ac3 \
  --enable-decoder=ape \
  --enable-decoder=flac \
  --enable-decoder=mp1 \
  --enable-decoder=mp2 \
  --enable-decoder=mp3 \
  --enable-decoder=mpc7 \
  --enable-decoder=mpc8 \
  --enable-decoder=tta \
  --enable-decoder=vorbis \
  --enable-decoder=wavpack \
  --enable-decoder=pcm_alaw \
  --enable-decoder=pcm_dvd \
  --enable-decoder=pcm_f32be \
  --enable-decoder=pcm_f32le \
  --enable-decoder=pcm_f64be \
  --enable-decoder=pcm_f64le \
  --enable-decoder=pcm_s16be \
  --enable-decoder=pcm_s16le \
  --enable-decoder=pcm_s16le_planar \
  --enable-decoder=pcm_s24be \
  --enable-decoder=pcm_s24le \
  --enable-decoder=pcm_s32be \
  --enable-decoder=pcm_s32le \
  --enable-decoder=pcm_s8 \
  --enable-decoder=pcm_u16be \
  --enable-decoder=pcm_u16le \
  --enable-decoder=pcm_u24be \
  --enable-decoder=pcm_u24le \
  \
  --disable-encoders \
  --enable-encoder=wavpack \
  --enable-encoder=pcm_alaw \
  --enable-encoder=pcm_f32be \
  --enable-encoder=pcm_f32le \
  --enable-encoder=pcm_f64be \
  --enable-encoder=pcm_f64le \
  --enable-encoder=pcm_s16be \
  --enable-encoder=pcm_s16le \
  --enable-encoder=pcm_s16le_planar \
  --enable-encoder=pcm_s24be \
  --enable-encoder=pcm_s24le \
  --enable-encoder=pcm_s32be \
  --enable-encoder=pcm_s32le \
  --enable-encoder=pcm_s8 \
  --enable-encoder=pcm_u16be \
  --enable-encoder=pcm_u16le \
  --enable-encoder=pcm_u24be \
  --enable-encoder=pcm_u24le \
  \
  --disable-filters \
  --enable-filter=acompressor \
  --enable-filter=acontrast \
  --enable-filter=acopy \
  --enable-filter=acrossfade \
  --enable-filter=acrossover \
  --enable-filter=acrusher \
  --enable-filter=acue \
  --enable-filter=adeclick \
  --enable-filter=adeclip \
  --enable-filter=adelay \
  --enable-filter=aintegral \
  --enable-filter=aecho \
  --enable-filter=aemphasis \
  --enable-filter=aeval \
  --enable-filter=afade \
  --enable-filter=afftdn \
  --enable-filter=afftfilt \
  --enable-filter=afir \
  --enable-filter=aformat \
  --enable-filter=agate \
  --enable-filter=aiir \
  --enable-filter=alimiter \
  --enable-filter=allpass \
  --enable-filter=aloop \
  --enable-filter=amerge \
  --enable-filter=amix \
  --enable-filter=amultiply \
  --enable-filter=anequalizer \
  --enable-filter=anull \
  --enable-filter=apad \
  --enable-filter=aphaser \
  --enable-filter=apulsator \
  --enable-filter=aresample \
  --enable-filter=areverse \
  --enable-filter=asetnsamples \
  --enable-filter=asetrate \
  --enable-filter=ashowinfo \
  --enable-filter=astats \
  --enable-filter=atempo \
  --enable-filter=atrim \
  --enable-filter=bandpass \
  --enable-filter=bandreject \
  --enable-filter=lowshelf \
  --enable-filter=biquad \
  --enable-filter=bs2b \
  --enable-filter=channelmap \
  --enable-filter=channelsplit \
  --enable-filter=chorus \
  --enable-filter=compand \
  --enable-filter=compensationdelay \
  --enable-filter=crossfeed \
  --enable-filter=crystalizer \
  --enable-filter=dcshift \
  --enable-filter=drmeter \
  --enable-filter=dynaudnorm \
  --enable-filter=earwax \
  --enable-filter=equalizer \
  --enable-filter=extrastereo \
  --enable-filter=firequalizer \
  --enable-filter=flanger \
  --enable-filter=haas \
  --enable-filter=hdcd \
  --enable-filter=headphone \
  --enable-filter=highpass \
  --enable-filter=join \
  --enable-filter=ladspa \
  --enable-filter=loudnorm \
  --enable-filter=lowpass \
  --enable-filter=lv2 \
  --enable-filter=mcompand \
  --enable-filter=pan \
  --enable-filter=replaygain \
  --enable-filter=resample \
  --enable-filter=rubberband \
  --enable-filter=sidechaincompress \
  --enable-filter=sidechaingate \
  --enable-filter=silencedetect \
  --enable-filter=silenceremove \
  --enable-filter=sofalizer \
  --enable-filter=stereotools \
  --enable-filter=stereowiden \
  --enable-filter=superequalizer \
  --enable-filter=surround \
  --enable-filter=highshelf \
  --enable-filter=tremolo \
  --enable-filter=vibrato \
  --enable-filter=volume \
  --enable-filter=volumedetect \

}

make_ffmpeg() {
  emmake make -j${NPROC}
}

build_ffmpegjs() {
  emcc \
    -I. -I./fftools -I$BUILD_DIR/include \
    -Llibavcodec -Llibavdevice -Llibavfilter -Llibavformat -Llibavresample -Llibavutil -Llibpostproc -Llibswscale -Llibswresample -Llibpostproc -L${BUILD_DIR}/lib \
    -Qunused-arguments -Oz \
    -o $2 fftools/ffmpeg_opt.c fftools/ffmpeg_filter.c fftools/ffmpeg_hw.c fftools/cmdutils.c fftools/ffmpeg.c \
    -lavdevice -lavfilter -lavformat -lavcodec -lswresample -lswscale -lavutil -lpostproc -lm -lx264 -lz \
    --closure 1 \
    --pre-js javascript/prepend.js \
    --post-js javascript/post.js \
    -s USE_SDL=2 \
    -s MODULARIZE=1 \
    -s SINGLE_FILE=$1 \
    -s EXPORTED_FUNCTIONS="[_ffmpeg]" \
    -s EXTRA_EXPORTED_RUNTIME_METHODS="[cwrap, FS, getValue, setValue]" \
    -s TOTAL_MEMORY=33554432 \
    -s ALLOW_MEMORY_GROWTH=1
}

main() {
  build_zlib
  build_x264
  configure_ffmpeg
  make_ffmpeg
  build_ffmpegjs 1 dist/ffmpeg-core.js
  build_ffmpegjs 0 dist-wasm/ffmpeg-core.js
}

main "$@"
