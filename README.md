# ElderCare AI Companion

**An intelligent elderly care, safety monitoring and assistance system**

![React](https://img.shields.io/badge/React-18-blue)
![Vite](https://img.shields.io/badge/Vite-Frontend-purple)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6-yellow)
![Deployment](https://img.shields.io/badge/Deployment-Vercel-black)
![Status](https://img.shields.io/badge/Status-Working%20Prototype-green)

## Live Demo

**Application:** https://elderly-care-companion-alpha.vercel.app/

## Project Overview

ElderCare AI Companion is an interactive web-based application designed to support elderly individuals in their daily lives through safety monitoring, voice-based interaction, automated reminders and caregiver assistance.

The system demonstrates how intelligent automation and assistive technologies can help elderly individuals maintain independence while improving communication with caregivers.

The current implementation is a functional academic prototype that uses browser-based speech recognition, speech synthesis and rule-based decision-making without requiring external API keys or backend infrastructure.

## Problem Statement

Elderly individuals living independently may face several challenges, including:

- Accidental falls and prolonged inactivity.
- Difficulty requesting immediate assistance.
- Forgetting medication and medical appointments.
- Irregular hydration routines.
- Limited access to continuous caregiver supervision.
- Difficulty interacting with complex digital interfaces.

ElderCare AI Companion aims to address these challenges through an accessible and user-friendly digital platform.

## Project Objectives

- Provide an interactive elderly care monitoring system.
- Demonstrate automated fall and inactivity response mechanisms.
- Enable voice-based communication.
- Generate caregiver alerts during potential emergencies.
- Assist elderly individuals with daily reminders.
- Provide a centralized dashboard for monitoring activities.
- Reduce dependence on manual interaction.

## Key Features

### 1. Interactive Dashboard

- Centralized monitoring interface.
- Resident safety status.
- Recent activity tracking.
- Reminder summaries.
- Caregiver alert overview.

### 2. Safety Monitoring

- Simulated fall detection.
- Simulated inactivity detection.
- Automated safety check-ins.
- Response timeout monitoring.
- Rule-based emergency escalation.

### 3. Voice-Based Assistant

- Speech-to-text conversion.
- Text-to-speech functionality.
- Voice-based safety check-ins.
- Spoken response recognition.
- Manual text input as an alternative.

### 4. Intelligent Response Classification

The system uses rule-based natural language classification to interpret resident responses.

| Resident Response | Classification | System Action |
|---|---|---|
| I am fine | SAFE | Resume monitoring |
| I am okay | SAFE | Close safety check |
| I need help | HELP | Generate caregiver alert |
| I am hurt | HELP | Generate caregiver alert |
| Unclear response | UNCLEAR | Repeat safety check |
| No response | TIMEOUT | Escalate the alert |

### 5. Caregiver Alert System

- Automatic in-app alert generation.
- Emergency event information.
- Alert history.
- Event timestamps.
- Centralized caregiver monitoring interface.

### 6. Smart Reminders

- Medication reminders.
- Hydration reminders.
- Appointment reminders.
- Daily activity management.
- Reminder tracking.

### 7. Analytics and Activity History

- Monitoring event history.
- Safety check-in records.
- Caregiver alert statistics.
- Activity summaries.

### 8. User-Friendly Interface

- Modern dashboard design.
- Dark and light mode.
- Organized navigation.
- Voice-enabled interaction.
- Customizable settings.

## Technology Stack

| Technology | Purpose |
|---|---|
| React.js | Frontend development |
| JavaScript | Application logic |
| HTML5 | Web structure |
| CSS3 | Styling and user interface |
| Vite | Development and build environment |
| Web Speech API | Speech recognition and synthesis |
| LocalStorage | Local data persistence |
| Rule-Based Classification | Intelligent response processing |
| Git and GitHub | Version control |
| Vercel | Application deployment |

## System Architecture

The application follows a client-side architecture.

    User Interaction
           |
           v
    React Application Interface
           |
           v
    Safety Monitoring Module
           |
           v
    Voice-Based Safety Check
           |
           v
    Speech-to-Text Conversion
           |
           v
    Rule-Based Response Classification
           |
           +--------------------------+
           |             |            |
          SAFE          HELP       UNCLEAR
           |             |            |
           v             v            v
        Resume       Caregiver      Repeat
       Monitoring      Alert       Check-in
                         |
                         v
                 Activity Logging

## System Workflow

1. The monitoring module receives a simulated fall or inactivity event.
2. The application initiates a safety check-in.
3. The voice assistant asks the resident about their condition.
4. The resident responds using voice or text.
5. The response is processed using rule-based classification.
6. The application determines the appropriate action.
7. If assistance is requested or the safety check times out, a caregiver alert is generated.
8. The event is recorded in the application history.

## Project Structure

    elderly-care-companion/
    |
    |-- src/
    |   |-- App.jsx
    |   |-- App.css
    |   |-- main.jsx
    |   |-- index.css
    |
    |-- index.html
    |-- package.json
    |-- vite.config.js
    |-- .gitignore
    |-- README.md

## Installation and Setup

### Prerequisites

- Node.js
- npm
- Git
- A modern web browser
- Visual Studio Code (optional)

### Step 1: Clone the Repository

    git clone YOUR_GITHUB_REPOSITORY_URL

### Step 2: Navigate to the Project Directory

    cd elderly-care-companion

### Step 3: Install Dependencies

    npm install

### Step 4: Start the Development Server

    npm run dev

### Step 5: Open the Application

Visit the following URL in your browser:

    http://localhost:5173

For Windows PowerShell environments where npm scripts are restricted, use:

    npm.cmd install
    npm.cmd run dev

## Production Build

To generate a production-ready build:

    npm run build

To preview the production build locally:

    npm run preview

## Deployment

The application is deployed using Vercel.

| Configuration | Value |
|---|---|
| Framework | Vite |
| Build Command | npm run build |
| Output Directory | dist |
| Environment Variables | Not required |

**Live Application:** https://elderly-care-companion-alpha.vercel.app/

## Privacy and Security

The current prototype follows a client-side approach to application processing and data storage.

- No external LLM integration.
- No external API keys required.
- No backend database required.
- Application records are stored locally using browser LocalStorage.
- No application-managed cloud storage of resident records.

Browser speech recognition may use online services depending on the browser implementation.

## Current Implementation Status

| Module | Status |
|---|---|
| Interactive Dashboard | Implemented |
| Speech-to-Text | Implemented |
| Text-to-Speech | Implemented |
| Response Classification | Implemented |
| Fall Detection | Simulated |
| Inactivity Detection | Simulated |
| In-App Caregiver Alerts | Implemented |
| Smart Reminders | Implemented |
| Analytics | Implemented |
| Local Data Storage | Implemented |
| LLM Integration | Future Enhancement |
| External Email and SMS Alerts | Future Enhancement |
| Real-Time Camera Monitoring | Future Enhancement |

## Limitations

- Fall and inactivity detection are simulated in the current prototype.
- Response classification is rule-based rather than LLM-based.
- Caregiver alerts are generated within the application.
- Speech recognition depends on browser compatibility and microphone permissions.
- Speech recognition may require internet connectivity.
- Reminders and monitoring operate while the application is active.
- LocalStorage is not a replacement for a secure production database.

## Future Enhancements

- Real-time fall detection using computer vision.
- Human pose estimation using MediaPipe or OpenCV.
- Large Language Model integration for contextual conversations.
- Automated email and SMS caregiver notifications.
- Secure backend integration using FastAPI.
- Database integration for persistent records.
- Caregiver authentication and role-based access.
- Remote caregiver monitoring.
- Wearable device integration.
- Multilingual voice assistance.
- Mobile application development.

## Applications

- Elderly home assistance.
- Assisted living facilities.
- Senior citizen care centres.
- Caregiver assistance platforms.
- Smart home healthcare research.
- Assistive technology demonstrations.

## Conclusion

ElderCare AI Companion demonstrates the potential of intelligent automation and voice-enabled technologies in elderly care. By combining safety monitoring, response classification, caregiver alerts and daily reminders, the project provides a foundation for developing a more comprehensive elderly assistance system.

The current working prototype establishes the core application workflow and provides opportunities for future integration with computer vision, artificial intelligence and real-time communication technologies.

## Disclaimer

This application is developed for academic and demonstration purposes. It is not a certified medical device, clinical monitoring platform or emergency response system. It should not replace professional medical care, human supervision or emergency services.

---

**ElderCare AI Companion — Technology for safer, smarter and more independent elderly living.**
