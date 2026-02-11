interface GoButtonProps {
  disabled: boolean;
  onClick: () => void;
}

export default function GoButton({ disabled, onClick }: GoButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`go-btn px-10 py-3 text-lg rounded-xl cursor-pointer ${
        disabled ? '' : 'animate-breathe'
      }`}
    >
      GO
    </button>
  );
}
