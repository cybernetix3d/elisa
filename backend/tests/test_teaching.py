"""Tests for teaching curriculum and prompt templates."""

from app.prompts.teaching import (
    CONCEPT_CURRICULUM,
    TEACHING_SYSTEM_PROMPT,
    get_curriculum_moment,
    teaching_user_prompt,
)


class TestConceptCurriculum:
    def test_has_source_control(self):
        assert "source_control" in CONCEPT_CURRICULUM

    def test_has_testing(self):
        assert "testing" in CONCEPT_CURRICULUM

    def test_has_decomposition(self):
        assert "decomposition" in CONCEPT_CURRICULUM

    def test_has_code_review(self):
        assert "code_review" in CONCEPT_CURRICULUM

    def test_first_commit_structure(self):
        moment = CONCEPT_CURRICULUM["source_control"]["first_commit"]
        assert "concept" in moment
        assert "headline" in moment
        assert "explanation" in moment
        assert "tell_me_more" in moment

    def test_all_entries_have_required_keys(self):
        for category_name, category in CONCEPT_CURRICULUM.items():
            for sub_name, moment in category.items():
                assert "concept" in moment, f"{category_name}.{sub_name} missing concept"
                assert "headline" in moment, f"{category_name}.{sub_name} missing headline"
                assert "explanation" in moment, f"{category_name}.{sub_name} missing explanation"


class TestGetCurriculumMoment:
    def test_found(self):
        result = get_curriculum_moment("source_control", "first_commit")
        assert result is not None
        assert result["headline"] == "Your helpers are saving their work!"

    def test_not_found_category(self):
        assert get_curriculum_moment("nonexistent", "first_commit") is None

    def test_not_found_sub(self):
        assert get_curriculum_moment("source_control", "nonexistent") is None


class TestPrompts:
    def test_system_prompt_not_empty(self):
        assert len(TEACHING_SYSTEM_PROMPT) > 0

    def test_user_prompt_formats(self):
        result = teaching_user_prompt("commit_created", "First commit", "game")
        assert "game" in result
        assert "commit_created" in result
