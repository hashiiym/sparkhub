"use client";

import { motion } from "framer-motion";

interface TimelinePhase {
  phase_name: string;
  focus: string;
  milestones: string[];
}

interface RoadmapData {
  profile_summary: string;
  recommended_paths: string[];
  academic_strategy: {
    key_subjects: string[];
    focus_areas: string;
  };
  entrance_exams: string[];
  target_colleges: string[];
  skill_development: string[];
  timeline: TimelinePhase[];
}

interface RoadmapTimelineProps {
  data: RoadmapData;
}

export default function RoadmapTimeline({ data }: RoadmapTimelineProps) {
  if (!data || !data.timeline || !Array.isArray(data.timeline)) {
    return null;
  }

  return (
    <div className="w-full max-w-full font-sans text-white/90 space-y-6 mt-4">
      {/* Header Card */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col gap-4"
      >
        <div>
          <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
            <span className="text-yellow-400">✨</span> Profile Summary
          </h2>
          <p className="text-gray-300 leading-relaxed text-sm md:text-base">{data.profile_summary}</p>
        </div>

        {data.recommended_paths && data.recommended_paths.length > 0 && (
          <div className="pt-4 border-t border-white/10 mt-2">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Recommended Paths</h3>
            <div className="flex flex-wrap gap-2">
              {data.recommended_paths.map((path, idx) => (
                <span key={idx} className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-3 py-1.5 rounded-full text-sm font-medium shadow-sm">
                  {path}
                </span>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      {/* Grid for other sections - only show if there is data */}
      {(data.entrance_exams?.length > 0 || data.skill_development?.length > 0 || data.academic_strategy?.key_subjects?.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Exams & Colleges */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-yellow-400 mb-3">Targets</h3>
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Entrance Exams</h4>
                <p className="text-sm text-gray-300">{data.entrance_exams?.join(", ")}</p>
              </div>
              <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Target Colleges</h4>
                <p className="text-sm text-gray-300">{data.target_colleges?.join(", ")}</p>
              </div>
            </div>
          </motion.div>
          
          {/* Academic Strategy */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }} className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-yellow-400 mb-3">Academic Strategy</h3>
            <div className="space-y-3">
              <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Key Subjects</h4>
                <p className="text-sm text-gray-300">{data.academic_strategy?.key_subjects?.join(", ")}</p>
              </div>
              <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Focus Areas</h4>
                <p className="text-sm text-gray-300">{data.academic_strategy?.focus_areas}</p>
              </div>
            </div>
          </motion.div>

          {/* Skill Development */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }} className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-yellow-400 mb-3">Skill Development</h3>
            <ul className="space-y-2">
              {data.skill_development?.map((skill, idx) => (
                <li key={idx} className="flex items-start text-sm text-gray-300">
                  <span className="mr-2 mt-1.5 w-1.5 h-1.5 rounded-full bg-yellow-500/70 flex-shrink-0"></span>
                  {skill}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      )}

      {/* Timeline */}
      <div className="relative py-6 pl-2 pr-2 w-full mt-4">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <span className="text-yellow-400">🚀</span> Action Timeline
        </h2>
        <div className="absolute left-6 top-16 bottom-8 w-0.5 bg-gradient-to-b from-yellow-400 via-yellow-200 to-transparent opacity-20"></div>
        
        {data.timeline.map((item, index) => (
          <motion.div 
            key={index}
            initial={{ opacity: 0, x: -20, y: 10 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.15 + 0.5, ease: "easeOut" }}
            className="relative mb-8 pl-10"
          >
            {/* Timeline Dot */}
            <div className="absolute left-[-0.6rem] top-4 flex items-center justify-center w-7 h-7 rounded-full bg-black border border-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.4)] z-10">
              <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
            </div>

            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 shadow-xl hover:bg-white/10 transition-colors duration-300">
              <h3 className="text-lg font-semibold text-white tracking-wide mb-1">
                {item.phase_name}
              </h3>
              <p className="text-gray-300 font-medium text-sm mb-3">Focus: <span className="text-gray-400">{item.focus}</span></p>
              
              <ul className="space-y-2">
                {item.milestones?.map((milestone, mIndex) => (
                  <motion.li 
                    key={mIndex}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: (index * 0.15) + (mIndex * 0.1) + 0.8 }}
                    className="flex items-start text-gray-400"
                  >
                    <span className="mr-3 mt-2 w-1.5 h-1.5 rounded-full bg-yellow-500/70 flex-shrink-0"></span>
                    <span className="leading-relaxed text-sm">{milestone}</span>
                  </motion.li>
                ))}
              </ul>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
