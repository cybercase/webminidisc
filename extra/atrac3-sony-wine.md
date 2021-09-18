# Some notes on how to use the original atrac3 encoder from sony with Wine
# This is just an experiment. Might not work at all on your hardware

apt update
DEBIAN_FRONTEND=noninteractive apt install -y wine-stable wget vim
wget https://github.com/cskau/atrac3util/releases/download/v0.0.1/atrac3util.exe
wget https://dl.winehq.org/wine/wine-mono/4.9.4/wine-mono-4.9.4.msi
# WINEARCH=win32 WINEPREFIX=~/.wine32 wineboot
wineboot
wine msiexec /i wine-mono-4.9.4.msi
wine64 msiexec /i wine-mono-4.9.4.msi
wget https://samples.ffmpeg.org/A-codecs/ATRAC3/atrac3.acm
cp atrac3.acm ~/.wine/drive_c/windows/system32/
cp atrac3.acm ~/.wine/drive_c/windows/syswow64/
vi ~/.wine/drive_c/windows/system.ini #msacm.at3=atrac3.acm
ls
wine64 atrac3util.exe
wine atrac3util.exe


apt-get install mono-complete
git clone https://github.com/cskau/atrac3util.git
cd atrac3util/
mcs -out:atrac3util.exe main.cs acm.cs
ls
wine atrac3util.exe
wine64 atrac3util.exe

dpkg --add-architecture i386 && apt-get update && apt-get install wine32
wine64 atrac3util.exe
ls ..
apt-get install ffmpeg
ffmpeg -i ../prova.mp3 prova.wav
wine64 atrac3util.exe prova.wav prova.at3
wine atrac3util.exe prova.wav prova.at3
cat ~/.bashrc
ls -la ~/
history -a
history -w history.txt


# how to compile
docker run -ti -v ${PWD}:/src --rm i386/ubuntu /bin/bash
apt update
apt install -y mono-complete
apt update
apt install git
git clone https://github.com/cskau/atrac3util.git
cd atrac3util/
mcs -out:atrac3util.exe main.cs acm.cs

# dockerfile
dpkg --add-architecture i386
apt update
DEBIAN_FRONTEND=noninteractive apt install -y wine32 wget
wineboot
wget https://dl.winehq.org/wine/wine-mono/4.9.4/wine-mono-4.9.4.msi
wine msiexec /i wine-mono-4.9.4.msi
wget https://samples.ffmpeg.org/A-codecs/ATRAC3/atrac3.acm
cp atrac3.acm ~/.wine/drive_c/windows/system32/
echo "msacm.at3=atrac3.acm" >> ~/.wine/drive_c/windows/system.ini
wget https://github.com/cskau/atrac3util/releases/download/v0.0.1/atrac3util.exe
wine atrac3util.exe prova.wav prova.at3

# bash idea

ID=$(docker run -itd atrac3)  # https://stackoverflow.com/questions/44577344/piping-docker-run-container-id-to-docker-exec
# for each file
    docker cp @file $ID:/tmp/file  # https://stackoverflow.com/questions/22907231/how-to-copy-files-from-host-to-docker-container
    docker exec -it $ID wine atrac3util.exe -lp2 /tmp/@file /tmp/@file.at3
    docker cp $ID:/tmp/file/@file.at3 ./file.at3

docker stop $ID
