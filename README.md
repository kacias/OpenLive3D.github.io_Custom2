# OpenLive3D

The open source project for Live3D Virtual Avatar.

<img src="asset/doc/screenshot.png" width="100%"/>


## TRY NOW!

 - Live Website: https://openlive3d.com/
 - GitHub Organization: https://github.com/OpenLive3D
 - Discord: [![Discord](https://badgen.net/badge/icon/discord?icon=discord&label)](https://discord.gg/pGPY5Jfhvz)
 - [Documents](https://github.com/OpenLive3D/OpenLive3D.document)
 - [Dev Log](DEVLOG.md)


## Project Features

Current Virtual Avatar software often require expensive setup. For this project, our goals are:

 - Easy to Use
 - Less Hardware Requirement
 - Highly Customizable


## Engineering Features

The project aims to connect the half-body movement with facial landmarks to the 3D `VRM` avatar.

 - Facial landmark model based on `TF.js`
 - Adjustable config to map landmarks to the avatar
 - Modularized and flexible structure


## Project Status

Beta-1.1.X:
 - Holistic in web worker (another thread)
 - Hand update debug


minimized_version (Branch):
- 전체 코드에서 몸 추적을 제외하고 모두 불성활화 시킴 
- 얼굴 탐지 불활성화 
- pose에서 손 탐지 불활성화 
- UI 불활성화(?)
