<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>EXPEDI-CARGO</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script>
      tailwind.config = {
        theme: {
          extend: {
            colors: {
              midnight: '#0F172A',
              midnightLight: '#1E293B',
              pureOrange: '#FF6B00',
            },
            fontFamily: { sans: ['Inter', 'sans-serif'] }
          }
        }
      }
    </script>
    <style>
      body { background-color: #0F172A; color: #ffffff; }
      .no-scrollbar::-webkit-scrollbar { display: none; }
      .marker-pulse {
        width: 20px; height: 20px; background: rgba(255,107,0,0.6);
        border-radius: 50%; box-shadow: 0 0 10px #FF6B00;
        animation: pulse-ring 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
      }
      @keyframes pulse-ring { 0% { transform: scale(0.33); opacity: 1; } 80%, 100% { transform: scale(2); opacity: 0; } }
    </style>
    <script type="importmap">
    {
      "imports": {
        "react": "https://esm.sh/react@18.2.0",
        "react-dom": "https://esm.sh/react-dom@18.2.0",
        "react-leaflet": "https://esm.sh/react-leaflet@4.2.1",
        "leaflet": "https://esm.sh/leaflet@1.9.4",
        "lucide-react": "https://esm.sh/lucide-react@0.263.1"
      }
    }
    </script>
  </head>
  <body class="no-scrollbar">
    <div id="root"></div>
    <script type="module" src="/src/index.tsx"></script>
  </body>
</html>
