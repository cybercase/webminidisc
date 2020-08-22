# Some notes on how to use the original atrac3 encoder from sony with Wine
# This is just an experiment. Might not work at all on your hardware

apt update
apt install wine-stable
wget https://github.com/cskau/atrac3util/releases/download/v0.0.1/atrac3util.exe
wget https://dl.winehq.org/wine/wine-mono/4.9.4/wine-mono-4.9.4.msi
WINEARCH=win32 WINEPREFIX=~/.wine32 wineboot
wineboot
wine msiexec /i wine-mono-4.9.4.msi
wine64 msiexec /i wine-mono-4.9.4.msi
wget https://samples.ffmpeg.org/A-codecs/ATRAC3/atrac3.acm
cp atrac3.acm ~/.wine/drive_c/windows/system32/
cp atrac3.acm ~/.wine/drive_c/windows/syswow64/
vi ~/.wine/drive_c/windows/system.ini
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
apt update
apt install wine-stable
wineboot
wget https://dl.winehq.org/wine/wine-mono/4.9.4/wine-mono-4.9.4.msi
wine msiexec /i wine-mono-4.9.4.msi
cp atrac3.acm ~/.wine/drive_c/windows/system32/
echo "msacm.at3=atrac3.acm" >> ~/.wine/drive_c/windows/system.ini
