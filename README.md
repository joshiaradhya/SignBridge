# SignBridge

**Learn sign language. Practise it on camera. Connect through signing.**

SignBridge is an AI-powered sign language learning and communication platform designed to make communication more accessible for people who use sign language and those who want to learn it.

The platform supports **Indian Sign Language (ISL)** and **American Sign Language (ASL)** through interactive learning modules, camera-based sign recognition, personalised practice, and real-time video communication.

🌐 **Live Website:** https://signbridge-three-vert.vercel.app/ 
💻 **GitHub:** https://github.com/joshiaradhya/SignBridge

---

## ✨ Features

### 1. Learn — Interactive Sign Language Learning

A structured learning environment for beginners and advanced learners.

- ASL and ISL learning resources.
- Lessons organised by difficulty:
  - Basic
  - Intermediate
  - Advanced
  - Conversations
- Visual sign references and step-by-step instructions.
- Guidance on handshape, movement, location, and facial expressions.
- Lesson completion and learning progress tracking.

### 2. SignLab — AI-Powered Sign Language Practice

An interactive practice environment that uses the device camera and machine learning to help users practise signs.

**Key capabilities:**
- Real-time camera access.
- MediaPipe hand landmark detection.
- Sign recognition using trained machine learning models.
- ONNX Runtime Web for browser-based inference.
- Practice attempts and recognition feedback.
- Guidance on handshape, location, movement, and expression.
- Personalised practice suggestions.

Sign recognition is designed to run directly in the browser, reducing the need to send raw camera footage to a remote recognition server.

### 3. SignConnect — Real-Time Communication

A communication feature designed to connect sign language learners through video calls.

**Features include:**
- Peer-to-peer video calling using WebRTC.
- Room creation and joining.
- Conversation partner matchmaking.
- Language and proficiency preferences.
- Camera and microphone controls.
- Live sign recognition and caption generation.
- Real-time communication between learners.

Sign recognition runs locally in the browser, while video and audio are transmitted through the WebRTC connection.

### 4. Dashboard and Gamification

A personalised dashboard that helps learners monitor their progress.

- Daily learning goals.
- Learning streaks.
- XP and achievements.
- Course completion tracking.
- Practice statistics.
- Personal profiles.
- Friend connections and progress tracking.

---

## 🧠 Machine Learning Architecture

SignBridge uses computer vision and machine learning to recognise sign-language movements.

The recognition pipeline is designed around MediaPipe landmark extraction and browser-based ONNX inference.

### Recognition Pipeline

1. **Video Capture:** Accesses the user's camera through the browser.
2. **Landmark Detection:** MediaPipe Tasks Vision extracts relevant body landmarks.
3. **Feature Extraction:** Extracted landmarks are normalised into a standard feature representation.
4. **Temporal Processing:** Sign sequences are resampled into a fixed-length sequence.
5. **Classification:** A trained ONNX model predicts the corresponding sign.
6. **Feedback:** Predictions are used to provide practice feedback or generate captions.

### Landmark Feature Schema

The current TypeScript feature schema uses version `2.0.0`.

| Component | Landmarks |
|---|---:|
| Left Hand | 21 |
| Right Hand | 21 |
| Upper Body Pose | 12 |
| Face | 20 |
| **Total** | **74** |

Each landmark contains three coordinates (X, Y, Z).

- 74 landmarks per frame.
- 222 features per frame.
- 32 temporal frames.
- 7,104 values per complete sequence.

The resulting model input has the shape:

`[batch, 32, 222]`

### Model Inference

The application uses:

- MediaPipe Tasks Vision for landmark detection.
- ONNX Runtime Web for browser-based machine learning inference.
- WebAssembly execution for model inference.
- A legacy centroid-based classifier as an ISL fallback when its model asset is available.

The classifier supports language-specific model metadata and configurable confidence thresholds.

---

## 🏗️ System Architecture

```text
                 SIGNBRIDGE
                     |
          React + TypeScript Frontend
                     |
              TanStack Start
                     |
       +-------------+-------------+
       |             |             |
      LEARN        SIGNLAB      SIGNCONNECT
       |             |             |
   Supabase      MediaPipe       WebRTC
   Courses       Landmarks       Video Calls
   Lessons           |             |
   Progress      Feature        Supabase
                 Extraction     Realtime
                    |              |
                ONNX Model    Sign Captions
                    |
              Recognition
                    |
                Feedback

                     |
              SUPABASE BACKEND
                     |
          +----------+----------+
          |          |          |
        Auth       Database   Storage
          |
       Profiles
       Progress
       Achievements
       Practice Attempts
```

---

## 🛠️ Technology Stack

| Category | Technologies |
|---|---|
| Frontend | React 19, TypeScript |
| Framework | TanStack Start, TanStack Router |
| Build Tool | Vite |
| Backend | Supabase |
| Authentication | Supabase Auth |
| Database | PostgreSQL |
| Realtime | Supabase Realtime |
| Computer Vision | MediaPipe Tasks Vision |
| Machine Learning | Python, TensorFlow / compatible training workflow |
| Model Inference | ONNX Runtime Web |
| Video Communication | WebRTC |
| Styling | Tailwind CSS 4, Radix UI |
| Data Fetching | TanStack Query |
| Deployment | Vercel |
| ML Development | Google Colab |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18 or newer.
- npm or Bun.
- A Supabase project.
- A modern browser.
- Webcam and microphone for SignLab and SignConnect.

### 1. Clone the Repository

```bash
git clone https://github.com/joshiaradhya/SignBridge.git

cd SignBridge
```

### 2. Install Dependencies

Using npm:

```bash
npm install
```

Alternatively, using Bun:

```bash
bun install
```

### 3. Configure Environment Variables

Create a `.env` file:

```bash
cp .env.example .env
```

Configure the required Supabase credentials.

```env
VITE_SUPABASE_URL=your_supabase_project_url

VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key

SUPABASE_URL=your_supabase_project_url

SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key

SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

DATABASE_URL=your_database_connection_string
```

Only configure variables required by the features and tooling you use.

**Important:** Never expose the Supabase service-role key in frontend code or commit real credentials to GitHub.

### 4. Start the Development Server

```bash
npm run dev
```

Open the local URL provided by Vite.

---

## 🔐 Supabase Configuration

SignBridge uses Supabase for authentication, database operations, and realtime functionality.

To configure Supabase:

1. Create a project at https://supabase.com/.
2. Obtain the project URL and publishable key.
3. Configure the environment variables.
4. Apply the SQL migrations located in `supabase/migrations/`.
5. Enable the authentication providers you intend to support.
6. Configure OAuth credentials and callback URLs.
7. Configure your application Site URL and Redirect URLs in Supabase Authentication settings.

Authentication providers can include:

- Email and password.
- Google.
- Apple.
- Microsoft (Azure).

Provider availability depends on the corresponding OAuth configuration.

---

## ☁️ Deployment

SignBridge is deployed using Vercel.

### Deployment Steps

1. Connect the GitHub repository to Vercel.
2. Configure the required environment variables.
3. Ensure the TanStack Start deployment configuration is used.
4. Configure Supabase authentication redirect URLs.
5. Deploy the application.

**Production Website:** https://signbridge-three-vert.vercel.app

Machine learning model training is handled separately from the Vercel deployment process.

Exported browser-compatible model assets must be included in the deployed application's public assets.

---

## 🤖 Machine Learning Development

The `ml/` and `notebooks/` directories contain the machine learning workflow.

The project is designed to support dataset preparation, landmark extraction, model training, evaluation, and ONNX export.

### Google Colab Workflow

Google Colab can be used for computationally intensive machine learning operations without relying on local hardware.

Clone the repository inside Colab:

```python
!git clone https://github.com/joshiaradhya/SignBridge.git /content/SignBridge

%cd /content/SignBridge

!pip install -r ml/requirements.txt
```

Import the project package:

```python
import sys

sys.path.insert(0, "/content/SignBridge")
```

The documented ML workflow includes:

1. Dataset preparation.
2. Signer-independent dataset splitting.
3. YOLO-based detection experiments.
4. MediaPipe landmark extraction.
5. Temporal sequence preparation.
6. Model training and evaluation.
7. ONNX model export.
8. Browser inference validation.

For detailed instructions, refer to:

- `ml/README.md`
- `ml/COLAB.md`
- `notebooks/`

### Model Assets

The browser classifier looks for language-specific model metadata:

```text
public/
└── models/
    ├── isl-metadata.json
    ├── asl-metadata.json
    └── isl-v1.json
```

The metadata references the ONNX model, labels, input/output names, and model configuration.

Actual recognition coverage depends on the model assets deployed with the application.

---

## 📁 Project Structure

```text
SignBridge/
│
├── public/
│   └── models/
│
├── src/
│   ├── assets/
│   │
│   ├── components/
│   │
│   ├── hooks/
│   │
│   ├── integrations/
│   │   └── supabase/
│   │
│   ├── lib/
│   │   ├── ml/
│   │   ├── learning.ts
│   │   ├── signbridge.ts
│   │   ├── sign-recognizer.ts
│   │   ├── isl-model.ts
│   │   └── signconnect.*
│   │
│   ├── routes/
│   │
│   └── styles.css
│
├── supabase/
│   └── migrations/
│
├── ml/
│
├── notebooks/
│
├── .env.example
├── package.json
├── vite.config.ts
└── vercel.json
```

---

## 🔒 Privacy and Security

SignBridge is designed with user privacy in mind.

- Camera permissions are requested through the browser.
- SignLab performs landmark extraction and recognition locally.
- Raw SignLab practice footage is not uploaded as part of the recognition workflow.
- SignConnect transmits call media to the other participant through WebRTC.
- Supabase manages authentication and application data.
- Protected server functions validate authenticated sessions.
- Database access should be protected through Row Level Security (RLS).

---

## ⚠️ Current Limitations

- Recognition accuracy depends on the quality and coverage of trained models.
- Model inference requires compatible ONNX model assets.
- The legacy centroid-based recognition fallback is currently ISL-specific.
- Sign-language recognition is not equivalent to complete natural-language translation.
- Signing variations, facial expressions, regional differences, and contextual meaning can affect recognition.
- Browser performance depends on the user's hardware and browser capabilities.
- SignConnect requires an internet connection and camera/microphone permissions.

---

## 🎯 Vision

The long-term vision of SignBridge is to make sign-language learning and communication more accessible through practical AI-powered tools.

By combining computer vision, machine learning, structured education, and real-time communication, SignBridge aims to help bridge communication gaps between sign-language users and the wider community.

---

## 🤝 Contributing

Contributions and suggestions are welcome.

1. Fork the repository.
2. Create a new feature branch.
3. Implement your changes.
4. Test your changes.
5. Submit a pull request.

When modifying the ML pipeline, ensure that the Python training implementation and TypeScript browser feature schema remain compatible.

---

## 📄 License

No repository license has been confirmed. All rights reserved unless a license is added to the repository.

---

**Built with the goal of making communication more accessible.**

⭐ If you find SignBridge interesting, consider starring the repository!
