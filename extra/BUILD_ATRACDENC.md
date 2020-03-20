# How to build atracdenc

## required libs
```
git clone https://github.com/erikd/libsndfile #4bdd741
cd libsndfile
docker run -ti -v`pwd`:/src trzeci/emscripten-upstream sh -c bash
mkdir build
cd build
emcmake cmake .. -DBUILD_TESTING=false -DENABLE_EXTERNAL_LIBS=false -DCMAKE_INSTALL_PREFIX=./installation
emmake make
emmake install
exit
```

## Build atracdenc executable
```
git clone https://github.com/dcherednik/atracdenc.git # e16e9c6
cd atracdenc
# Copy the libsndfile library
# cp -r ../libsndfile/build/installation libsndfile
cd src
# Remove the TEST_BIG_ENDIAN block in CMakeFile.txt. WASM is little endian.
docker run -ti -v`pwd`:/src trzeci/emscripten-upstream sh -c bash
mkdir build
cd build
emcmake cmake .. -DLIBSNDFILE_INCLUDE_DIR=../../libsndfile/include/ -DSNDFILE_LIBRARY=../../libsndfile/lib/libsndfile.a
emmake make
# Build an optimized executable
`cat CMakeFiles/atracdenc.dir/link.txt` --closure 1 -Oz -s MODULARIZE=1 -s SINGLE_FILE=1 -s ALLOW_MEMORY_GROWTH=1 -s INVOKE_RUN=0 -s EXTRA_EXPORTED_RUNTIME_METHODS="[callMain, FS]"
```
