# FolderSorter
![PNPM](https://img.shields.io/badge/pnpm-%234a4a4a.svg?style=flat&logo=pnpm&logoColor=f69220)
![License: MIT](https://img.shields.io/github/license/AstralJaeger/foldersorter)
![build](https://github.com/AstralJaeger/foldersorter/actions/workflows/build.yml/badge.svg?branch=master)
![release](https://github.com/AstralJaeger/foldersorter/actions/workflows/release.yml/badge.svg?branch=master)

A small tool to sort a folder by document type and run file conversion.
The application moves all files in the watched folder into sub-folders like archives, images, videos, executables and documents. 
Images and videos will at the same time be converted to sharable formats like png and jpg. 

I wrote this tool to keep my downloads folder sorted since it ended up being cluttered quite quickly.
I've primarily set it up to work on windows and didn't test it on Linux. 
MacOS support is neither planned nor considered since it comes with Magic folders.

## Setup
The tool is built to be a Windows service, you can easily set it up using mssn. 
Download ``mssn`` from [mssn.cc](http://nssm.cc/). Install [FFmpeg](https://www.ffmpeg.org/) and [ImageMagick **7**](https://imagemagick.org/index.php) and add them to path.
2. Download ``app.exe`` from [releases](https://github.com/AstralJaeger/foldersorter/releases/latest) and copy it into a directory for your choosing. ``%APPDATA%/foldersorter`` would be a good choice.
3. Run a terminal as Adiminstrator and navigate to ``mssn.exe`` 
4. Use the path to the exe as application path and the path to the directory of the exe as startup directory e.g. Path: ``%APPDATA%/foldersorter/app.exe`` and Startup directory: ``%APPDATA%/foldersorter/app.exe``. **Important** Set a service name at the bottom, like ``foldersorter-srv``.
5. (*Optional*) You can fill in some details in the ``Details`` tab if you'd like.
6. Click Install Service.
7. Set the environment variable ``FOLDER_PATH`` to the directory you want FolderSorter to sort.
8. Run ``mssn start foldersorter-srv`` in your terminal.

If you want to stop or remove your service you can use: 

``nssm stop foldersorter-srv`` or ``nssm remove foldersorter-srv`` accordingly.

