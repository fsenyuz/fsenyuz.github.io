# Furkan Senyuz - Professional Portfolio

This is the professional portfolio of Furkan Senyuz, a Civil Engineer & AI Solutions Developer. The portfolio showcases a unique blend of physical infrastructure expertise and digital intelligence, featuring an interactive map, dynamic experience timelines, multi-language support, and an AI-powered chatbot.

## Features

- **Interactive Global Experience Map:** Uses Leaflet.js to map out educational, work, and tender experiences globally.
- **Dynamic Content & Multi-Language Support:** Data is driven by a `data.json` file, allowing easy updates and translations (English, Turkish, Serbian).
- **AI Integration:** Includes a chatbot interface designed to connect to an external backend API for answering visitor queries.
- **Responsive & Accessible UI:** Designed with a mobile-first approach, featuring dark/light mode detection and toggling.
- **Progressive Web App (PWA):** Implements a Service Worker (`sw.js`) for caching assets and offline capabilities.
- **Performance Optimized:** Clean separation of HTML, CSS (`style.css`), and JavaScript (`main.js`).

## Project Structure

- `index.html`: The main entry point of the website.
- `style.css`: All styling, including responsive design and animations.
- `main.js`: Core application logic, including map initialization, language toggling, and UI interactions.
- `sw.js`: Service worker for PWA caching and offline support.
- `data.json`: The data source for the portfolio content (experience, education, translations, etc.).
- `profile.jpg`: Profile image.

## How to Run Locally

You can serve this project locally using any simple HTTP server.

For example, using Python 3:

```bash
python3 -m http.server 8000
```

Then, open your browser and navigate to `http://localhost:8000`.

## Contact & Links

- **LinkedIn:** [https://www.linkedin.com/in/fsenyuz](https://www.linkedin.com/in/fsenyuz)
- **GitHub:** [https://github.com/fsenyuz](https://github.com/fsenyuz)
- **Kaggle:** [https://kaggle.com/fsenyuz](https://kaggle.com/fsenyuz)
