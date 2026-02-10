export default function MapPlaceholder({ onSelectLocation }) {
  const fakePick = () => {
    onSelectLocation({
      lat: 21.028,
      lng: 105.85,
    });
  };

  return (
    <div
      style={{
        height: "400px",
        background: "#ddd",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <button onClick={fakePick}>Chọn vị trí giả lập</button>
    </div>
  );
}
