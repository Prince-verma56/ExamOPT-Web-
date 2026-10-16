import { describe, expect, it } from "vitest";
import { PRESENTATION_SLIDES } from "@/app/ppt/slides";

describe("ExamOpt presentation configuration", () => {
  it("defines exactly eight consecutive slides", () => {
    expect(PRESENTATION_SLIDES).toHaveLength(8);
    expect(PRESENTATION_SLIDES.map((slide) => slide.number)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8,
    ]);
  });

  it("keeps all slide copy and image metadata editable and complete", () => {
    PRESENTATION_SLIDES.forEach((slide) => {
      expect(slide.title.trim()).not.toBe("");
      expect(slide.description.trim()).not.toBe("");
      expect(slide.keyPoints.length).toBeGreaterThan(0);

      if (slide.image) {
        expect(slide.image.src).toMatch(/^\/Images\/PPT Images\/.+\.png$/);
        expect(slide.image.alt.trim()).not.toBe("");
        expect(slide.image.caption.trim()).not.toBe("");
      }
    });
  });
});
