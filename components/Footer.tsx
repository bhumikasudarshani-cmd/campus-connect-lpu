'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { GraduationCap, Heart, Shield, BookOpen, MessageCircle } from 'lucide-react';

export default function Footer() {
  const [communityUrl, setCommunityUrl] = useState<string>(
    process.env.NEXT_PUBLIC_COMMUNITY_INVITE_URL || 'https://chat.whatsapp.com/ElGakQUGGa1IMam5FlAiqw'
  );

  useEffect(() => {
    async function loadCommunityUrl() {
      try {
        const res = await fetch('/api/stats/public');
        if (res.ok) {
          const data = await res.json();
          if (data.communityInviteUrl) {
            setCommunityUrl(data.communityInviteUrl);
          }
        }
      } catch (e) {}
    }
    loadCommunityUrl();
  }, []);

  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Brand Col */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-lpu-600 to-amber-500 flex items-center justify-center text-white shadow-md">
                <GraduationCap className="w-5 h-5" />
              </div>
              <span className="font-extrabold text-xl text-white tracking-tight">
                Campus Connect <span className="text-lpu-500">LPU</span>
              </span>
            </div>
            <p className="text-sm text-slate-400 max-w-sm leading-relaxed">
              Your centralized hub for Lovely Professional University study materials. Empowering over 2,000+ LPU students with high-yield subject notes, solved mid-term & end-term papers, and previous year questions organized year-wise.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <a
                href={communityUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                Join WhatsApp Community
              </a>
            </div>
          </div>

          {/* Quick Browse */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">
              Study Categories
            </h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>
                <Link href="/subjects" className="hover:text-white transition-colors">
                  📖 Course Directory
                </Link>
              </li>
              <li>
                <Link href="/library?type=Notes" className="hover:text-white transition-colors">
                  📚 Subject Notes
                </Link>
              </li>
              <li>
                <Link href="/library?type=Mid-Term" className="hover:text-white transition-colors">
                  📝 Mid-Term Papers
                </Link>
              </li>
              <li>
                <Link href="/library?type=End-Term" className="hover:text-white transition-colors">
                  📕 End-Term Solved
                </Link>
              </li>
              <li>
                <Link href="/library?type=PYQs" className="hover:text-white transition-colors">
                  📄 Previous Year PYQs
                </Link>
              </li>
            </ul>
          </div>

          {/* Year-wise Portals */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">
              Academic Year Portals
            </h4>
            <div className="flex flex-col space-y-2 text-sm text-slate-400">
              <Link href="/library?year=1" className="hover:text-white transition-colors">
                🎓 1st Year (Freshmen)
              </Link>
              <Link href="/library?year=2" className="hover:text-white transition-colors">
                🎓 2nd Year (Core Dept)
              </Link>
              <Link href="/library?year=3" className="hover:text-white transition-colors">
                🎓 3rd Year (Advanced)
              </Link>
              <Link href="/library?year=4" className="hover:text-white transition-colors">
                🎓 4th Year (Capstone & Placements)
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>
            © {new Date().getFullYear()} Campus Connect LPU. Designed with care for LPU Students.
          </p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-slate-400" />
              Verified Academic Content
            </span>
            <span>•</span>
            <Link href="/community" className="hover:text-slate-300">
              Community Membership
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
