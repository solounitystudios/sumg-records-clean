interface SpotifyEmbedProps {
  type: "artist" | "album" | "track" | "playlist";
  id: string;
  height?: number;
}

export function SpotifyEmbed({ type, id, height = 352 }: SpotifyEmbedProps) {
  return (
    <iframe
      src={`https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0`}
      width="100%"
      height={height}
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      loading="lazy"
      title={`Spotify ${type} player`}
      style={{ border: "none" }}
    />
  );
}
