const Card = ({ children }) => {
  return (
    <div className="bg-zinc-800 rounded-xl border border-zinc-700 p-6 text-zinc-100">
      {children}
    </div>
  );
};

export default Card; 