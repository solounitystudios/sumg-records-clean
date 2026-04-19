"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { ReactNode } from "react";

interface CardProps {
  children?: ReactNode;
  className?: string;
  hover?: boolean;
  glass?: boolean;
}

interface ArtistCardProps {
  name: string;
  genre: string;
  image: string;
  bio: string;
}

interface ReleaseCardProps {
  title: string;
  artist: string;
  coverArt: string;
  releaseDate: string;
  type: string;
}

export function Card({ children, className = "", hover = true, glass = false }: CardProps) {
  return (
    <motion.div
      whileHover={hover ? { y: -4 } : undefined}
      transition={{ duration: 0.2 }}
      className={`rounded-lg overflow-hidden ${
        glass
          ? "glass-effect"
          : "bg-dark-800 border border-gray-800 hover:border-gold-600/40"
      } transition-all duration-300 ${className}`}
    >
      {children}
    </motion.div>
  );
}

export function ArtistCard({ name, genre, image, bio }: ArtistCardProps) {
  return (
    <Card>
      <div className="relative h-56 overflow-hidden">
        <Image
          src={image}
          alt={name}
          fill
          className="object-cover transition-transform duration-500 hover:scale-105"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-transparent to-transparent" />
        <div className="absolute bottom-3 left-3">
          <span className="text-xs text-gold-400 bg-dark-900/80 px-2 py-1 rounded-full border border-gold-600/30">
            {genre}
          </span>
        </div>
      </div>
      <div className="p-5">
        <h3 className="text-lg font-bold font-serif text-white mb-2">{name}</h3>
        <p className="text-gray-400 text-sm leading-relaxed line-clamp-3">{bio}</p>
      </div>
    </Card>
  );
}

export function ReleaseCard({ title, artist, coverArt, releaseDate, type }: ReleaseCardProps) {
  return (
    <Card>
      <div className="relative h-48 overflow-hidden">
        <Image
          src={coverArt}
          alt={title}
          fill
          className="object-cover transition-transform duration-500 hover:scale-105"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-transparent to-transparent" />
        <div className="absolute top-3 right-3">
          <span className="text-xs text-gold-400 bg-dark-900/90 px-2 py-1 rounded-full border border-gold-600/30 capitalize">
            {type}
          </span>
        </div>
      </div>
      <div className="p-5">
        <h3 className="text-lg font-bold font-serif text-white mb-1">{title}</h3>
        <p className="text-gold-500 text-sm mb-2">{artist}</p>
        <p className="text-gray-500 text-xs">{new Date(releaseDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
      </div>
    </Card>
  );
}
